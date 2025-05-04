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
    res.redirect('/stock-chart')
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

// Start server - moved to end of file
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

module.exports = app;