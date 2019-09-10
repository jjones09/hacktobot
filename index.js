const from = '2019-09-30T10%3A00%3A00%2B00%3A00';
const until = '2019-11-01T12%3A00%3A00%2B00%3A00';
const target = 4;

const { TOKEN } = require('./bot-config.json');

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
});

const getGraphUrl = prCount => {
    const count = prCount > target ? target : prCount;
    return `https://hacktobot.jojon3s.workers.dev/contributions-${count}.png`;
}

const getGithubOpenedIssues = async user => {
    const url = `https://api.github.com/search/issues?q=-label:invalid+created:${from}..${until}+type:pr+is:public+author:${user}&per_page=300`;
    const opts = {
        headers: new Headers({'User-Agent': 'request'}),
        method: 'GET'
    }
    const res = await fetch(url, opts);
    const body = await res.json();
    return body;
}

const getContributionResponse = prCount => {
    let responseText = 'You haven\'t opened any PRs yet, but it\'s not too late to get started!';
    if (prCount >= 1 && prCount < target) responseText = `${prCount} down, ${target - prCount} to go. Keep it up!`;
    if (prCount === target) responseText = `You've completed all ${prCount} PRs. Nice one! Enjoy that t-shirt!`;
    if (prCount > target) responseText = `${prCount} PRs?!? Save some for the rest of us! Nicely done though!`;
    return responseText;
}

buildSlackbotResponse = (message, chartUrl) => JSON.stringify({
    response_type: 'in_channel',
    blocks: [
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: message
            },
            accessory: {
                type: 'image',
                image_url: chartUrl,
                alt_text: 'Contributions Chart'
            }
        }]
    }
);

handleRequest = async (request) => {
    const { pathname } = new URL(request.url);

    if (request.method !== 'POST') {
        let lastSegment = pathname.substring(pathname.lastIndexOf('/'));
        lastSegment = lastSegment.replace('/', '');
        if (lastSegment.includes('.png')) {
            const { imageData } = require('./imageData')
            const prCount = lastSegment.match(/contributions\-(.*?).png/)[1];
            const img = (imageData[prCount] || imageData[0]).data;
            const buff = new Buffer(img);
            return new Response(buff, { status: 200, headers: { 'Content-Type': 'image/png' } });
        }
    }

    const data = await request.formData();

    if (data.get('token') !== TOKEN) return new Response('Invalid token', { status: 403 });
    if (!data.get('text')) return new Response('Please add user search param', { status: 500 });

    const user = data.get('text');
    const { total_count } = await getGithubOpenedIssues(user);
    
    return new Response(buildSlackbotResponse(
        getContributionResponse(total_count),
        getGraphUrl(total_count)
    ),
    { status: 200, headers: { 'Content-Type': 'application/json' } });
}
