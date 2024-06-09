document.getElementById('scrapeForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const url = document.getElementById('boardUrl').value;

    try {
        const response = await fetch('/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Scraping failed');
        }

        console.log(data.message);
        document.getElementById('status').innerText = data.message;
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('status').innerText = `Error: ${error.message}`;
    }
});
