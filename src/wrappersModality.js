var bot = require('nodemw');
var wrapper = require('./wrappers.js');
var _ = require('underscore');
var fs = require('fs');
const jsonfile = require('jsonfile');
var counterPages = 0;
var counterRevisions = 0;
var functions = require('./functions.js');

function Preview(parsedRequest) { //da splittare caso erro e caso body===undefined
    return new Promise((resolve, reject) => {

        let info = {
            "protocol": "https",  // default to 'http'
            "server": parsedRequest.h,  // host name of MediaWiki-powered site
            "path": "/w",                  // path to api.php script
            "debug": false,                // is more verbose when set to true
            "username": "Monitorwikibotdb",             // account to be used when logIn is called (optional)
            "password": "Slart1bartfastW",             // password to be used when logIn is called (optional)
            "userAgent": "belluccidamiano@gmail.com",      // define custom bot's user agent
            "concurrency": 100               // how many API requests can be run in parallel (defaults to 3)
        }

        let start = new Date().getTime();

        try {
            client = new bot(info);
        } catch (e) { return; };

        client.logIn(async error => {

            if (error) {
                console.log(error);
                return;
            }


            ///////////////////////////////////////// RICERCA PAGINE /////////////////////////////////////////
            //Estrapolo i corrispondenti id delle pagine che soddisfano la query di ricerca (flag -q)
            let allPagesQuery = await Promise.resolve(functions.searchPages(parsedRequest));
            ///////////////////////////////////////// FINE RICERCA PAGINE /////////////////////////////////////////

            timespanArray = parsedRequest.t.split(',');
            timespanArray[0] = timespanArray[0].substr(0, 4) + '-' + timespanArray[0].substr(4, 2) + '-' + timespanArray[0].substr(6, 2) + 'T00:00:00.000Z';
            timespanArray[1] = timespanArray[1].substr(0, 4) + '-' + timespanArray[1].substr(4, 2) + '-' + timespanArray[1].substr(6, 2) + 'T23:59:59.999Z';

            ///////////////////////////////////////// RICERCA DATA CREAZIONE PAGINE /////////////////////////////////////////
            //Per determinare se una pagina è stata creata all'interno del timespan (flag -t) e quindi includerlo
            //nella ricerca, ho bisogno della data di creazione della pagina
            allPagesQuery = await Promise.resolve(functions.searchFirstRevision(parsedRequest, timespanArray, allPagesQuery));
            ///////////////////////////////////////// FINE DATA CREAZIONE PAGINE /////////////////////////////////////////

            ///////////////////////////////////////// RICERCA REVISIONI PAGINE /////////////////////////////////////////
            let revisions = await Promise.resolve(functions.searchRevisions(parsedRequest, timespanArray, allPagesQuery));
            ///////////////////////////////////////// FINE REVISIONI PAGINE /////////////////////////////////////////

            let misalignedPages = [];

            misalignedPages = revisions.filter((el) => {
                return el.misalignment.nEdit || el.misalignment.frequencyEdit;
            });

            if (!parsedRequest.hasOwnProperty('a')) {
                revisions = misalignedPages;
            }

            for (el of revisions) {
                counterRevisions += el.revisions.history.length;
            }

            resolve({ numberOfPages: { all: allPagesQuery.length, misaligned: misalignedPages.length }, resultofPreview: revisions, revCounter: counterRevisions, timer: new Date().getTime() - start });
        });
    });
};

module.exports.Preview = Preview;