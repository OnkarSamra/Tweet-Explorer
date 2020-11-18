// Data to be passed into the chart
let data = {
    labels: ["Positive", "Neutral", "Negative"],

    datasets: [{
        label: "Sentiment",
        barPercentage: 0.5,
        barThickness: 6,
        maxBarThickness: 8,
        minBarLength: 2,
        data: document.getElementById("chart-script").getAttribute("value").split(","),
        backgroundColor:["rgba(99, 255, 132, 0.5)","rgba(255, 205, 86, 0.5)","rgba(255, 99, 132, 0.5)"]
    }]
};

// Create new chart in canvas 
new Chart(document.getElementById("sentiment-graph-2").getContext('2d'), {
    type: 'bar',
    data: data,
    options: {
        responsive: true,
        maintainAspectRatio: false,
        title: {
            display: true,
            text: "Sentiment"},
        legend: {display: false},
        scales: {"yAxes":[{"ticks":{"beginAtZero":true}}]}
    }   
});