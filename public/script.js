document.getElementById('scrape-form').addEventListener('submit', async function (event) {
    event.preventDefault();

    const url = document.getElementById('url').value;
    const messageDiv = document.getElementById('message');

    try {
        const response = await fetch('/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const urls = await response.json();
        messageDiv.innerHTML = '<h3>Scraping Completed!</h3><p>Scraped URLs:</p><ul>' +
            urls.map(url => `<li><a href="${url}" target="_blank">${url}</a></li>`).join('') +
            '</ul>';
    } catch (error) {
        console.error('Error:', error);
        messageDiv.textContent = 'Error: ' + error.message;
    }
});
