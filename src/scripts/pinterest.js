import puppeteer from 'puppeteer';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COOKIE_PATH = path.join(__dirname, '../data/cookie.txt');

async function getSessionCookie() {
    if (fs.existsSync(COOKIE_PATH)) {
        const cookieData = fs.readFileSync(COOKIE_PATH, 'utf8');
        return cookieData.trim();
    }

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.goto('https://www.pinterest.com/login/', { waitUntil: 'networkidle2' });

    console.log('Please log in to Pinterest.');

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 0 });

    const cookies = await page.cookies();
    await browser.close();

    console.log('All cookies:', cookies);

    const sessionCookie = cookies.find(cookie => cookie.name === 'csrftoken').value;
    if (!sessionCookie) {
        throw new Error('Session cookie not found');
    }

    fs.writeFileSync(COOKIE_PATH, sessionCookie);

    return sessionCookie;
}

async function getBoardId(boardUrl, cookie) {
    const response = await axios.get(boardUrl, {
        headers: {
            cookie: `csrftoken=${cookie}`,
        },
    });

    const boardIdRegex = /<script id="__PWS_INITIAL_PROPS__" type="application\/json">(.*?)<\/script>/;
    const match = response.data.match(boardIdRegex);
    if (match) {
        const initialProps = JSON.parse(match[1]);
        const boardId = Object.keys(initialProps.initialReduxState.boards)[0];
        return boardId;
    }

    throw new Error('Board ID not found');
}

async function paginatePinterestBoard(boardUrl, cookie) {
    const boardId = await getBoardId(boardUrl, cookie);

    let bookmark = null;
    let hasMore = true;
    const allExternalUrls = [];

    while (hasMore) {
        const response = await axios.get(
            'https://www.pinterest.com/resource/BoardFeedResource/get/',
            {
                params: {
                    source_url: boardUrl,
                    data: JSON.stringify({
                        options: {
                            board_id: boardId,
                            board_url: boardUrl,
                            currentFilter: -1,
                            field_set_key: 'react_grid_pin',
                            filter_section_pins: true,
                            sort: 'default',
                            layout: 'default',
                            page_size: 100,
                            redux_normalize_feed: true,
                            bookmarks: [bookmark],
                        },
                        context: {},
                    }),
                    _: Date.now(),
                },
                headers: {
                    accept: 'application/json, text/javascript, */*, q=0.01',
                    'accept-language': 'en-US,en;q=0.9',
                    cookie: `csrftoken=${cookie}`,
                    dnt: '1',
                    priority: 'u=1, i',
                    referer: 'https://www.pinterest.com/',
                    'sec-ch-ua': '"Chromium";v="125", "Not.A/Brand";v="24"',
                    'sec-ch-ua-full-version-list':
                        '"Chromium";v="125.0.6422.60", "Not.A/Brand";v="24.0.0.0"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-model': '""',
                    'sec-ch-ua-platform': '"macOS"',
                    'sec-ch-ua-platform-version': '"14.4.0"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-origin',
                    'user-agent':
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                    'x-app-version': 'aa48037',
                    'x-pinterest-appstate': 'active',
                    'x-pinterest-pws-handler': 'www/[username]/[slug].js',
                    'x-pinterest-source-url': boardUrl,
                    'x-requested-with': 'XMLHttpRequest',
                },
            }
        );

        const pins = response.data.resource_response.data || [];
        const externalUrls = pins.map(pin => pin.link).filter(url => url !== null);
        console.log(externalUrls);

        allExternalUrls.push(...externalUrls);

        bookmark = response.data.resource_response.bookmark;
        hasMore = !!bookmark;
    }

    const outputPath = path.join(__dirname, '../data/external_urls.json');
    fs.writeFileSync(outputPath, JSON.stringify(allExternalUrls, null, 2));
    console.log(`External URLs have been saved to ${outputPath}`);
}

async function main(boardUrl) {
    const sessionCookie = await getSessionCookie();
    await paginatePinterestBoard(boardUrl, sessionCookie);
}

const boardUrl = process.argv[2];
if (!boardUrl) {
    console.error('Please provide a Pinterest board URL.');
    process.exit(1);
}

main(boardUrl).catch(error => console.error('Error:', error));
