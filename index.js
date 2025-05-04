require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

const app = express();
const port = process.env.PORT || 3000;

const path = require('path');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// Configure chart rendering
const width = 800;
const height = 600;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

// Add these essential middleware (removing duplicated middleware)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const connection_string = process.env.MONGODB_URI;
if (!connection_string) {
    console.error('MONGODB_URI is not defined in environment variables');
    process.exit(1);
}

mongoose.connect(connection_string, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Connected!', mongoose.connection.name))
.catch(err => console.error(err));

mongoose.connection.on('disconnected', () => console.log('MongoDB disconnected'));
mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));

const K100 = require('./models/K100');

app.get('/', (req, res) => {
    res.render('home.ejs')
});

app.get('/stock-chart', async (req, res) => {
    var results = [];

    try {
        const data = await K100.find();
        // console.log(data)  TODO : remove

        results = data.filter(item =>
            item.Price && item.Open && item.High && item.Low && item['Change %']
        );
        
    } catch (err) {
        res.status(500).json({ message: 'Error fetching data', error: err });
        return; // Add return to prevent further execution on error
    }

    const dates = results.map(item => item.Date).reverse(); // <-- this line is required

    // Process the data
    const prices = results.map(item => parseFloat((item.Price || '0').replace(/,/g, ''))).reverse();
    const open = results.map(item => parseFloat((item.Open || '0').replace(/,/g, ''))).reverse();
    const highs = results.map(item => parseFloat((item.High || '0').replace(/,/g, ''))).reverse();
    const lows = results.map(item => parseFloat((item.Low || '0').replace(/,/g, ''))).reverse();
    
    const change = results.map(item => parseFloat(item['Change %'].replace('%', ''))).reverse();

    // console.log(results)  TODO :remove
    

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
                    label: 'Change %',
                    data: change,
                    borderColor: 'rgb(201, 203, 207)',
                    tension: 0.1,
                    yAxisID: 'y1'
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
                            if (context.dataset.label.includes('Change')) {
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
                        text: 'Change %'
                    }
                }
            }
        }
    };

    res.render('stock-chart.ejs', { 
        title: "Karachi 100 Historical Data",
        chartConfig: JSON.stringify(configuration)
    });
});

app.get('/seasonality', async (req, res) => {
    try {
        const { stockSymbol } = req.query; // Get stock symbol from query parameters (search)

        // Modify the query to filter by stock symbol if provided
        const query = stockSymbol ? { Symbol: stockSymbol } : {};

        const data = await K100.find(query);  // Filtered by stock symbol if provided

        const monthlyChanges = Array.from({ length: 12 }, () => []);

        data.forEach(item => {
            if (item.Date && item['Change %']) {
                const [month, , year] = item.Date.split('/').map(Number);
                const change = parseFloat(item['Change %'].replace('%', ''));
                if (!isNaN(month) && !isNaN(change)) {
                    monthlyChanges[month - 1].push(change);
                }
            }
        });

        const avgMonthly = monthlyChanges.map((arr, idx) => {
            const sum = arr.reduce((a, b) => a + b, 0);
            const avg = arr.length ? sum / arr.length : 0;
            return {
                month: new Date(0, idx).toLocaleString('default', { month: 'long' }),
                averageChange: parseFloat(avg.toFixed(2))
            };
        });

        // Build chart config for rendering (line chart instead of bar)
        const labels = avgMonthly.map(m => m.month);
        const dataPoints = avgMonthly.map(m => m.averageChange);

        const chartConfig = {
            type: 'line',  // Change from bar to line chart
            data: {
                labels: labels,
                datasets: [{
                    label: `Avg Monthly Change %${stockSymbol ? ' for ' + stockSymbol : ''}`,
                    data: dataPoints,
                    fill: false,
                    borderColor: 'rgba(54, 162, 235, 0.7)', // line color
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: `Monthly Stock Seasonality${stockSymbol ? ` (${stockSymbol})` : ''} - Change %`
                    },
                    tooltip: {
                        callbacks: {
                            label: context => `${context.raw.toFixed(2)}%`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Average Change %'
                        }
                    }
                }
            }
        };

        // Render to EJS
        res.render('seasonality.ejs', {
            title: "Monthly Seasonality",
            chartConfig: JSON.stringify(chartConfig),
            stockSymbol: stockSymbol || ''
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error calculating seasonality', error: err });
    }
});

// Start server - moved to end of file
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

module.exports = app;