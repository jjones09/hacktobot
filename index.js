const chartjs = require('chart.js');
const { CanvasRenderService } = require('chartjs-node-canvas');

const from = '2019-09-30T10%3A00%3A00%2B00%3A00';
const until = '2019-11-01T12%3A00%3A00%2B00%3A00';
const target = 4;
const scale = 200;

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
});

const sanitizeUsername = username => username.replace('/', '');

const getGraphUrl = prCount => {
    const count = prCount > target ? target : prCount;
    return `hacktobot.jojon3s.workers.dev/contributions-${count}.png`;
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

const createContributionChart = async prCount => {
    const count = prCount > target ? target : prCount;
    const colourList = [];
    const dataPoints = [];
    for(let pr = 1; pr<= count; pr++) {
        colourList.push(colours[pr - 1]);
        dataPoints.push(1);
    }
    const chartConfig = {
        type: 'doughnut',
        data: {
            datasets: [ {
                data: [ ...dataPoints, target - count ] ,
                backgroundColor: [...colourList, '#C0BFC0'],
                borderColor: '#fff',
                borderWidth: 10
            } ]
        },
        options: {
            rotation: 1 * Math.PI,
            circumference: 1 * Math.PI
        }
    };
    const renderService = new CanvasRenderService(scale, scale, null, null, () => chartjs);
    return renderService.renderToBufferSync(chartConfig);
}

const getContributionResponse = prCount => {
    let responseText = 'You haven\'t opened any PRs yet, but it\'s not too late to get started!';
    if (prCount >= 1 && prCount < target) responseText = `${prCount} down, ${target - prCount} to go. Keep it up!`;
    if (prCount === target) responseText = `You've completed all ${prCount} PRs. Nice one! Enjoy that t-shirt!`;
    if (prCount > target) responseText = `${prCount} PRs?!? Save some for the rest of us! Nicely done though!`;
    return responseText;
}

handleRequest = async (request) => {
    const { pathname, searchParams } = new URL(request.url);

    let lastSegment = pathname.substring(pathname.lastIndexOf('/'));
    lastSegment = lastSegment.replace('/', '');
    if (lastSegment.includes('.png')) {
        const { imageData } = require('./imageData')
        const prCount = lastSegment.match(/contributions\-(.*?).png/)[1];
        const img = (imageData[prCount] || imageData[0]).data;
        const buff = new Buffer(img);
        return new Response(buff, { status: 200, headers: { 'Content-Type': 'image/png' } });
    }
    
    if (!searchParams.has('user')) return new Response('Please add user search param', { status: 500 });

    const user = sanitizeUsername(searchParams.get('user'));
    const { total_count } = await getGithubOpenedIssues(user);
    return new Response(JSON.stringify({
        text: getContributionResponse(total_count),
        chartUrl: getGraphUrl(total_count)
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
