// import dependencies you will use
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

const { check, validationResult } = require('express-validator');

var app = express();
app.use(express.urlencoded({extended:false}));

mongoose.connect('mongodb://localhost:27017/projectGeekyAthlete', {
    useNewUrlParser: true, 
    useUnifiedTopology: true
});

const Order = mongoose.model('Order', {
    firstName: String,
    lastName: String,
    address: String,
    city: String,
    province: String,
    phoneno: String,
    email: String,
    poster1Details: {
        poster1price: Number,
        poster1Qty: Number,
        poster1total: Number,
    },
    poster2Details: {
        poster2price: Number,
        poster2Qty: Number,
        poster2total: Number,
    },
    poster3Details: {
        poster3price: Number,
        poster3Qty: Number,
        poster3total: Number,
    },
    subTotal: Number,
    taxAmt: Number,
    stateTax: Number,
    totalAmt: Number,
    postcode: String,
    deliverytime: String
})

// set path to public folders and view folders
app.set('views', path.join(__dirname, 'views'));
//use public folder for CSS etc.
app.use(express.static(__dirname+'/public'));
app.set('view engine', 'ejs');

//  VALIDATONS
const regex = { 
    string: /^[A-Za-z ]*$/,
    address: /^[#.0-9a-zA-Z\s,-]*$/,
    name: /^[A-Za-z,. ]*$/,
    email: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/,
    phoneRegex: /^[0-9]{10}$/,
    positiveNo: /^[0-9]*$/,
    postcode: /^[A-Z][0-9][A-Z]\s[A-Z][0-9][A-Z]$/
}; 

const MIN_PURCHASE_VALUE = 10;
const POSTER_PRICE = 4.99;

const provinceDetails = [
    {
        "provinceName": 'Alberta',
        "tax": .05
    }, 
    {
        "provinceName": 'British Columbia',
        "tax": .12
    }, 
    {
        "provinceName": 'Manitoba',
        "tax": .12
    }, 
    {
        "provinceName": 'New Brunswick',
        "tax": .15
    }, 
    {
        "provinceName": 'Newfoundland and Labrador',
        "tax": .15
    }, 
    {
        "provinceName": 'Northwest Territories',
        "tax": .05
    }, 
    {
        "provinceName": 'Nova Scotia',
        "tax": .15
    }, 
    {
        "provinceName": 'Nunavut',
        "tax": .05
    }, 
    {
        "provinceName": 'Ontario',
        "tax": .13
    }, 
    {
        "provinceName": 'Prince Edward Island',
        "tax": .15
    }, 
    {
        "provinceName": 'Quebec',
        "tax": .149
    }, 
    {
        "provinceName": 'Saskatchewan',
        "tax": .11
    }, 
    {
        "provinceName": 'Yukon',
        "tax": .05
    }
];

function checkRegex(userInput, regex) {
    return ((regex.test(userInput)) ? true : false);
}

function phoneValidation(value) {
    if (value) {
        if (!checkRegex(value, regex.phoneRegex)) {
            throw new Error('Please enter correct Phone No. It should be 10 digits.');
        }
    }
    return true;
}

function emailValidation(value) {
    if (value) {
        if (!checkRegex(value, regex.email)) {
            throw new Error('Email address should be like username@website.com');
        }
    }
    return true;
}

function postcodeValidation(value) {
    if (value) {
        if (!checkRegex(value, regex.postcode)) {
            throw new Error('Please enter correct Postcode. eg. A2A A2A.');
        }
    }
    return true;
}

// ROUTES 
//home page
app.get('/', function(req, res){
    res.render('index'); // no need to add .ejs to the file name
});

app.post('/', [
    check('firstName', 'Please enter correct First Name. Only characters allowed.').notEmpty().matches(regex.name),
    check('lastName', 'Please enter correct Last Name. Only characters allowed.').notEmpty().matches(regex.name),
    check('address', 'Please enter correct Address. Only Characters, Numbers, and Special Characters (,-) allowed.').notEmpty().matches(regex.address),
    check('city', 'Please enter correct City. Only characters allowed.').notEmpty().matches(regex.string),
    check('province', 'Please select a Province as it is required.').notEmpty().matches(regex.string),
    check('phoneno', 'Please enter correct Phone No. It should be 10 digits.').notEmpty().matches(regex.phoneRegex),
    check('email', 'Email address should be like username@website.com').notEmpty().matches(regex.email),
    check('postcode', 'Please enter correct Postcode. eg. A2A A2A.').notEmpty().matches(regex.postcode),
    check('deliverytime', 'Please select a valid Delivery Time.').notEmpty(),
    check('poster1Qty', 'Please enter valid Quantity. Only +ve values allowed.').notEmpty().matches(regex.positiveNo),
    check('poster2Qty', 'Please enter valid Quantity. Only +ve values allowed.').notEmpty().matches(regex.positiveNo),
    check('poster3Qty', 'Please enter valid Quantity. Only +ve values allowed.').notEmpty().matches(regex.positiveNo),
], function(req, res){
    console.log('REQUEST RECEIVED', req.body);

    const errors = validationResult(req);
    console.log(errors);

    var {
        firstName, lastName, address, city, province, phoneno, email, postcode, deliverytime,
        poster1Qty, poster2Qty, poster3Qty
    } = req.body;

    const formDataObject = {
        firstName, lastName, address, city, province, phoneno, email, postcode, deliverytime, poster1Qty, poster2Qty, poster3Qty
    }

    if (!errors.isEmpty()) {
        res.render('shop', { errors: errors.array(), provinceDetails, 
            formData: formDataObject
        }); 
    } else {
        
        const poster1total = (poster1Qty * POSTER_PRICE);
        const poster2total = (poster2Qty * POSTER_PRICE);
        const poster3total = (poster3Qty * POSTER_PRICE);

        var subTotal = poster1total + poster2total + poster3total;                    

        // if subtotal < 10$ render page with error.
        if(subTotal < MIN_PURCHASE_VALUE ){
            res.render('shop', {
                errors: [{ msg: `MINIMUM PURCHASE OF CA$10 REQUIRED. YOU HAD A PURCHASE OF CA$${subTotal}.` }],
                formData: formDataObject
            });
            return;
        }

        const index = provinceDetails.findIndex(val => val.provinceName == province);
        const stateTax = provinceDetails[index].tax;
        var taxAmt = subTotal * stateTax;
        var totalAmt = subTotal + taxAmt;
    
        var receiptData = {
            firstName, lastName, address, city, province, phoneno, email, postcode, deliverytime,
            poster1Qty, poster2Qty, poster3Qty,
            poster1total, poster2total, poster3total,
            subTotal: subTotal.toFixed(2),
            taxAmt: taxAmt.toFixed(2),
            stateTax: stateTax * 100,
            totalAmt: totalAmt.toFixed(2),
            poster1price: POSTER_PRICE,
            poster2price: POSTER_PRICE,
            poster3price: POSTER_PRICE
        };
        var receiptDataSchema = {
            firstName, lastName, address, city, province, phoneno, email, postcode, deliverytime, 
            subTotal: subTotal.toFixed(2),
            taxAmt: taxAmt.toFixed(2),
            stateTax: stateTax * 100,
            totalAmt: totalAmt.toFixed(2),
            poster1Details: {
                poster1price: POSTER_PRICE,
                poster1Qty,
                poster1total
            },
            poster2Details: {
                poster2price: POSTER_PRICE,
                poster2Qty,
                poster2total
            },
            poster3Details: {
                poster3price: POSTER_PRICE,
                poster3Qty,
                poster3total
            }
        };

        var myOrder = new Order(receiptDataSchema);
        myOrder.save();

        console.log('Receipt Data ', receiptData);        

        res.render('receipt', receiptData);
    }

});

app.get('/orders', function(req, res) {
    Order.find({}).exec(function(err, orders){
        console.log('ORDERS :: ', orders);

        res.render('orders', {orders: orders});
    });
});


//Shop Page
app.get('/shop',function(req,res){
    res.render('shop', {
        provinceDetails: provinceDetails
    });
});

// start the server and listen at a port
const PORT = 8080;
app.listen(PORT, () => {
    console.log(`Website is up and running at localhost:${PORT}`);
});
