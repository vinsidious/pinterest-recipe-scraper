const axios = require('axios');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function getBoardId(boardUrl, cookie) {
    const response = await axios.get(`https://www.pinterest.com${boardUrl}`, {
        headers: {
            cookie: cookie,
        },
    });

    const boardIdRegex =
        /<script id="__PWS_INITIAL_PROPS__" type="application\/json">(.*?)<\/script>/;
    const match = response.data.match(boardIdRegex);
    if (match) {
        const initialProps = JSON.parse(match[1]);
        const boardId = Object.keys(initialProps.initialReduxState.boards)[0];
        return boardId;
    }

    throw new Error('Board ID not found');
}

async function getSessionCookie() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://www.pinterest.com/login/', { waitUntil: 'networkidle2' });

    console.log('Please log in to Pinterest.');

    // Wait for the user to log in
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Get cookies
    const cookies = await page.cookies();
    await browser.close();

    const sessionCookie = cookies.find(cookie => cookie.name === 'session').value;
    return sessionCookie;
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
                    cookie: cookie,
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
            },
        );

        const pins = _.get(response, 'data.resource_response.data', []);
        const externalUrls = pins.map((pin) => pin.link).filter((url) => url !== null);
        console.log(externalUrls);

        allExternalUrls.push(...externalUrls);

        bookmark = _.get(response, 'data.resource_response.bookmark');
        hasMore = !!bookmark;
    }

    // Write the URLs to external_urls.json
    const outputPath = path.join(__dirname, '../data/external_urls.json');
    fs.writeFileSync(outputPath, JSON.stringify(allExternalUrls, null, 2));
    console.log(`External URLs have been saved to ${outputPath}`);
}

async function main() {
    const { default: inquirer } = await import('inquirer');

    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'boardUrl',
            message: 'Enter the Pinterest board URL:',
        },
    ]);

    const boardUrl = answers.boardUrl;
    const cookie = await getSessionCookie();

    await paginatePinterestBoard(boardUrl, cookie);
}

main();
