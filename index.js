const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { type } = require('os');

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
// app.set('views', path.join(__dirname, 'views'));

// Configure chart rendering
const width = 800;
const height = 600;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

app.get('/' , (req,res) => {
    res.redirect('/stock-chart')
});

app.get('/stock-chart', (req, res) => {
    var filename = 'dataset/Karachi 100 Historical Data.csv';
    const results = [];

    fs.createReadStream(filename)
        // .pipe(csv())
        // Add this option to your csv-parser
        .pipe(csv({ skipLines: 1, headers: ['Date','Price','Open','High','Low','Vol','Change'] }))
        .on('data', (data) => results.push(data))
        .on('end', () => {
            // Process the data
            const dates = results.map(item => item.Date).reverse(); // Reverse to show oldest first
            const prices = results.map(item => parseFloat(item.Price.replace(/,/g, ''))).reverse();
            const open = results.map(item => parseFloat(item.Open.replace(/,/g, ''))).reverse();
            const highs = results.map(item => parseFloat(item.High.replace(/,/g, ''))).reverse();
            const lows = results.map(item => parseFloat(item.Low.replace(/,/g, ''))).reverse();
            
            // Remove "M" from volume and convert to number
            const vol = results.map(item => parseFloat(item.Vol.replace('M', ''))).reverse();
            
            // Remove % from change and convert to number
            const change = results.map(item => parseFloat(item.Change.replace('%', ''))).reverse();

            const configuration = {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [
                        {
                            label: 'Price',
                            data: prices,
                            borderColor: 'rgb(75, 192, 192)',
                            tension: 0.1,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Open',
                            data: open,
                            borderColor: 'rgb(54, 162, 235)',
                            tension: 0.1,
                            yAxisID: 'y'
                        },
                        {
                            label: 'High',
                            data: highs,
                            borderColor: 'rgb(255, 99, 132)',
                            tension: 0.1,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Low',
                            data: lows,
                            borderColor: 'rgb(153, 102, 255)',
                            tension: 0.1,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Volume (Millions)',
                            data: vol,
                            borderColor: 'rgb(255, 159, 64)',
                            tension: 0.1,
                            yAxisID: 'y1'
                        },
                        {
                            label: 'Change %',
                            data: change,
                            borderColor: 'rgb(201, 203, 207)',
                            tension: 0.1,
                            yAxisID: 'y2'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Karachi 100 Historical Data'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.dataset.label.includes('Volume')) {
                                        label += context.raw.toFixed(2) + 'M';
                                    } else if (context.dataset.label.includes('Change')) {
                                        label += context.raw.toFixed(2) + '%';
                                    } else {
                                        label += context.raw.toLocaleString();
                                    }
                                    return label;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Price/Open/High/Low'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            grid: {
                                drawOnChartArea: false,
                            },
                            title: {
                                display: true,
                                text: 'Volume (Millions)'
                            }
                        },
                        y2: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            grid: {
                                drawOnChartArea: false,
                            },
                            title: {
                                display: true,
                                text: 'Change %'
                            },
                            offset: true
                        }
                    }
                }
            };

            // Send the configuration as JSON or render an HTML page with the chart
            // res.json(configuration);
            // Or if you want to render an HTML page:
            res.render('stock-chart', { 
                title: "Karachi 100 Historical Data", // Make sure this is included
                chartConfig: JSON.stringify(configuration)
            });
        });
});