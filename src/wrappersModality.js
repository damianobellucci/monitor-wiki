var bot = require('nodemw');
var fs = require('fs');
const jsonfile = require('jsonfile');
var functions = require('./functions.js');
var wrapper = require('./wrappers.js');
const chalk = require('chalk');
const _ = require('underscore');

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

        try {
            client = new bot(info);
        } catch (e) { return; };

        client.logIn(async error => {

            if (error) {
                console.log(error);
                return;
            }

            let start = new Date().getTime();
            ///////////////////////////////////////// RICERCA PAGINE /////////////////////////////////////////
            //Estrapolo i corrispondenti id delle pagine che soddisfano la query di ricerca (flag -q)
            let pagesId = await Promise.resolve(functions.searchPages(parsedRequest));

            console.log('\nTot. pagine dopo cernita (doppioni): ', pagesId.length);

            ///////////////////////////////////////// FINE RICERCA PAGINE /////////////////////////////////////////

            timespanArray = parsedRequest.t.split(',');
            timespanArray[0] = timespanArray[0].substr(0, 4) + '-' + timespanArray[0].substr(4, 2) + '-' + timespanArray[0].substr(6, 2) + 'T00:00:00.000Z';
            timespanArray[1] = timespanArray[1].substr(0, 4) + '-' + timespanArray[1].substr(4, 2) + '-' + timespanArray[1].substr(6, 2) + 'T23:59:59.999Z';

            ///////////////////////////////////////// RICERCA DATA CREAZIONE PAGINE /////////////////////////////////////////
            //Per determinare se una pagina è stata creata all'interno del timespan (flag -t) e quindi includerlo
            //nella ricerca, ho bisogno della data di creazione della pagina
            console.log('\n' + 'Tot. pagine prima della cernita (prima revisione):', pagesId.length);

            let objectFirstRevision = await Promise.resolve(functions.searchFirstRevision(parsedRequest, timespanArray, pagesId));

            let infoPagesCreatedInTimespan = objectFirstRevision.pagesCreatedInTimespan;

            console.log('\n' + 'Tot. pagine dopo la cernita (prima revisione):', infoPagesCreatedInTimespan.length);
            ///////////////////////////////////////// FINE DATA CREAZIONE PAGINE /////////////////////////////////////////

            ///////////////////////////////////////// RICERCA REVISIONI PAGINE /////////////////////////////////////////
            let revisions = [];
            if (parsedRequest.hasOwnProperty('n') || parsedRequest.hasOwnProperty('f')) revisions = await Promise.resolve(functions.searchRevisions(parsedRequest, timespanArray, infoPagesCreatedInTimespan.map(pageInfo => pageInfo.title)));
            ///////////////////////////////////////// FINE REVISIONI PAGINE /////////////////////////////////////////

            ///////////////////////////////////////// RICERCA COMMENTI PAGINE /////////////////////////////////////////
            let talksPagesInfo = [];
            if (parsedRequest.hasOwnProperty('c')) talksPagesInfo = await Promise.resolve(functions.getPageTalks(infoPagesCreatedInTimespan, timespanArray));

            ///////////////////////////////////////// FINE COMMENT PAGINE /////////////////////////////////////////

            ///////////////////////////////////////// INZIO RICERCA VIEWS PAGINE /////////////////////////////////////////
            let viewsPagesInfo = [];
            if (parsedRequest.hasOwnProperty('v')) viewsPagesInfo = await Promise.resolve(functions.getPageViews(infoPagesCreatedInTimespan, parsedRequest.t.split(','), parsedRequest));
            //console.log(viewsPagesInfo);

            ///////////////////////////////////////// FINE RICERCA VIEWS PAGINE /////////////////////////////////////////

            ///////////////////////////////////////// INZIO RICOMBINAZIONE /////////////////////////////////////////

            let recombinedObject = {};

            for (let page of infoPagesCreatedInTimespan) {
                let object = { title: page.title, pageid: page.pageid };

                if (parsedRequest.hasOwnProperty('n') || parsedRequest.hasOwnProperty('f')) {
                    object.edits = revisions.find((el) => { return el.pageid === page.pageid });
                }

                if (parsedRequest.hasOwnProperty('c')) {
                    object.comments = talksPagesInfo.find((el) => { return el.pageid === page.pageid });
                }

                if (parsedRequest.hasOwnProperty('v')) {
                    object.views = viewsPagesInfo.find((el) => { return el.pageid === page.pageid });
                }

                recombinedObject[page.pageid] = object;

            }

            ///////////////////////////////////////// FINE RICOMBINAZIONE ////////////////////////////////////////

            ///////////////////////////////////////// INZIO AGGREGAZIONE /////////////////////////////////////////

            let aggregatedObject = {};

            for (let page in recombinedObject) {
                let object = { title: recombinedObject[page].title, pageid: page };

                if (parsedRequest.hasOwnProperty('n')) {
                    object.edits = recombinedObject[page].edits.revisions.history.length;
                }

                if (parsedRequest.hasOwnProperty('f')) {
                    object.frequency = Math.round(recombinedObject[page].edits.revisions.history.length * 1000 * 60 * 60 * 24 * 365 / (new Date(timespanArray[1]).getTime() - new Date(timespanArray[0]).getTime()), 2);
                }

                if (parsedRequest.hasOwnProperty('c')) {

                    if (recombinedObject[page].comments.history === 'n/a') {
                        //console.log(recombinedObject[page]);
                        object.comments = 'n/a';
                    }
                    else object.comments = recombinedObject[page].comments.history.length;
                }

                if (parsedRequest.hasOwnProperty('v')) {
                    recombinedObject[page].views.dailyViews === 'Not Available' ?
                        object.views = 'n/a' : object.views = recombinedObject[page].views.dailyViews.map(el => el.views).reduce((a, b) => a + b, 0);
                }
                aggregatedObject[page] = object;
            }

            ///////////////////////////////////////// INIZIO TAG DISALLINEATE/NON DISALLINEATE /////////////////////////////////////////

            for (let page in aggregatedObject) {
                aggregatedObject[page].misalignment = {};


                if (parsedRequest.hasOwnProperty('n')) {

                    if (parsedRequest.n.split(',')[1] === '*')
                        (aggregatedObject[page].edits >= parsedRequest.n.split(',')[0]) ?
                            aggregatedObject[page].misalignment.edits = true : aggregatedObject[page].misalignment.edits = false
                    else
                        (aggregatedObject[page].edits >= parsedRequest.n.split(',')[0] && aggregatedObject[page].edits <= parsedRequest.n.split(',')[1]) ?
                            aggregatedObject[page].misalignment.edits = true : aggregatedObject[page].misalignment.edits = false;

                }

                if (parsedRequest.hasOwnProperty('f')) {

                    if (parsedRequest.f.split(',')[1] === '*')
                        (aggregatedObject[page].frequency >= parsedRequest.f.split(',')[0]) ?
                            aggregatedObject[page].misalignment.frequency = true : aggregatedObject[page].misalignment.frequency = false
                    else
                        (aggregatedObject[page].frequency >= parsedRequest.f.split(',')[0] && aggregatedObject[page].frequency <= parsedRequest.f.split(',')[1]) ?
                            aggregatedObject[page].misalignment.frequency = true : aggregatedObject[page].misalignment.frequency = false;

                }

                if (parsedRequest.hasOwnProperty('c')) {

                    if (parsedRequest.c.split(',')[1] === '*')
                        (aggregatedObject[page].comments >= parsedRequest.c.split(',')[0]) ?
                            aggregatedObject[page].misalignment.comments = true : aggregatedObject[page].misalignment.comments = false
                    else
                        (aggregatedObject[page].comments >= parsedRequest.c.split(',')[0] && aggregatedObject[page].comments <= parsedRequest.c.split(',')[1]) ?
                            aggregatedObject[page].misalignment.comments = true : aggregatedObject[page].misalignment.comments = false;

                }

                if (parsedRequest.hasOwnProperty('v')) {

                    if (aggregatedObject[page].views === 'n/a') aggregatedObject[page].misalignment.views = 'n/a'; //mettendo come valore di misalignment.views n/a, in isMisaligned la pagina risulterà disallineata
                    else {
                        if (parsedRequest.v.split(',')[1] === '*')
                            (aggregatedObject[page].views >= parsedRequest.v.split(',')[0]) ?
                                aggregatedObject[page].misalignment.views = true : aggregatedObject[page].misalignment.views = false
                        else
                            (aggregatedObject[page].views >= parsedRequest.v.split(',')[0] && aggregatedObject[page].views <= parsedRequest.v.split(',')[1]) ?
                                aggregatedObject[page].misalignment.views = true : aggregatedObject[page].misalignment.views = false;
                    }

                }
            }

            ///
            for (let page in aggregatedObject) {
                aggregatedObject[page].misalignment = { isMisaligned: functions.isMisaligned(aggregatedObject[page], parsedRequest), misalignmentForFilter: aggregatedObject[page].misalignment };
            }
            ///

            ///////////////////////////////////////// FINE TAG DISALLINEATE/NON DISALLINEATE /////////////////////////////////////////

            ///////// se non c'è flag -a tolgo dal risultato le pagine non disallineate
            if (!parsedRequest.hasOwnProperty('a'))
                for (let page in aggregatedObject) {
                    !aggregatedObject[page].misalignment.isMisaligned ? delete (aggregatedObject[page]) : null;
                }

            ///////////////////////////////////////// FINE AGGREGAZIONE /////////////////////////////////////////

            for (let page in aggregatedObject) {
                !aggregatedObject[page].misalignment.isMisaligned ?
                    (
                        console.log(
                            'Title: ' + chalk.green(aggregatedObject[page].title), '|',
                            'misalignment:', 'false', '|',
                            aggregatedObject[page].hasOwnProperty('edits') ? 'edits: ' + aggregatedObject[page].edits : '',
                            aggregatedObject[page].hasOwnProperty('frequency') ? 'frequency: ~ ' + aggregatedObject[page].frequency : '',
                            aggregatedObject[page].hasOwnProperty('comments') ? 'comments: ' + aggregatedObject[page].comments : '',
                            aggregatedObject[page].hasOwnProperty('views') ? 'views: ' + aggregatedObject[page].views : ''
                        )
                    ) : (
                        console.log(
                            'Title: ' + chalk.green(aggregatedObject[page].title) + ' |',
                            'misalignment:', chalk.red('true'), '|',
                            aggregatedObject[page].hasOwnProperty('edits') ? 'edits: ' + aggregatedObject[page].edits : '',
                            aggregatedObject[page].hasOwnProperty('frequency') ? 'frequency: ~ ' + aggregatedObject[page].frequency : '',
                            aggregatedObject[page].hasOwnProperty('comments') ? 'comments: ' + aggregatedObject[page].comments : '',
                            aggregatedObject[page].hasOwnProperty('views') ? 'views: ' + aggregatedObject[page].views : ''

                        )
                    );
            }

            let counterMisalignedPages = 0;
            for (el in aggregatedObject) {
                //if(aggregatedObject[el].misalignment.isMisaligned)console.log(aggregatedObject[el]);
                counterMisalignedPages += aggregatedObject[el].misalignment.isMisaligned;
            }

            console.log(
                '\nTime elapsed:', Math.round((new Date().getTime() - start) / 1000) + 's', ',',
                counterMisalignedPages, 'misaligned pages', '/', infoPagesCreatedInTimespan.length, 'total pages', '\n'
            );
            resolve(aggregatedObject);
        });
    });
};

async function Info(parsedRequest) {
    return new Promise(async (resolve, reject) => {

        console.log('\nInizio lettura file di input');
        //jsonfile.readFile('results/'+parsedRequest.f, async function (err, resultPreview) {

        let resultPreview = JSON.parse((await functions.readFile('../results/' + parsedRequest.f)));

        if (resultPreview.pages.length == 0) { console.log('Error: input file doesn\'t contain any page.'); return; }
        console.log('\nFine lettura file di input');
        //console.log(Object.values(resultPreview.pages).map(el => el.title)); return;

        let info = {
            "protocol": "https",  // default to 'http'
            "server": resultPreview.query.h,  // host name of MediaWiki-powered site
            "path": "/w",                  // path to api.php script
            "debug": false,                // is more verbose when set to true
            "username": "Monitorwikibotdb",             // account to be used when logIn is called (optional)
            "password": "Slart1bartfastW",             // password to be used when logIn is called (optional)
            "userAgent": "belluccidamiano@gmail.com",      // define custom bot's user agent
            "concurrency": 100               // how many API requests can be run in parallel (defaults to 3)
        }

        try {
            client = new bot(info);
        } catch (e) {

            console.log(e);
            return;
        };

        client.logIn(async error => {

            if (error) {
                console.log(error);
                return;
            }
            let queue = [];
            var allPagesQuery = [];

            let arrayOfPageId = [];


            for (let page in resultPreview.pages) {
                arrayOfPageId.push(page);
            }

            allPagesQuery = arrayOfPageId;


            let timespanArray = parsedRequest.t.split(',');
            timespanArray[0] = timespanArray[0].substr(0, 4) + '-' + timespanArray[0].substr(4, 2) + '-' + timespanArray[0].substr(6, 2) + 'T00:00:00.000Z';
            timespanArray[1] = timespanArray[1].substr(0, 4) + '-' + timespanArray[1].substr(4, 2) + '-' + timespanArray[1].substr(6, 2) + 'T23:59:59.999Z';


            parsedRequest.h = resultPreview.query.h;


            let objectFirstRevision = await Promise.resolve(functions.searchFirstRevision(parsedRequest, timespanArray, allPagesQuery));


            let queueFirstRevisions = objectFirstRevision.pagesCreatedInTimespan;

            allPagesQuery = []

            for (el of queueFirstRevisions) {
                allPagesQuery.push(el.title);
            }


            let start = new Date().getTime();


            let result = await Promise.resolve(functions.searchRevisions(parsedRequest, timespanArray, allPagesQuery));

            let counterRevisions = 0;

            //conto revisioni totali
            for (el of result) {
                counterRevisions += el.revisions.history.length;
            }

            console.log('\n' + 'Time elapsed ' + (new Date().getTime() - start) / 1000 + 's', '|', result.length, 'total pages', '|', counterRevisions + " revisions");


            if (result.length == 0) { console.log('Error: there aren\'t pages for the timespan ' + parsedRequest.t + '.'); return; }
            else {

                let startExport = new Date().getTime();

                let indexPreferences = functions.getIndexFlagPreferences(parsedRequest);


                /////////////////////////////////////////INIZIO RICERCA EXPORT/////////////////////////////////////////////////

                console.log('\nInizio ricerca informazioni delle revisioni\n');

                if (indexPreferences.edit) {
                    result = await functions.getPageExport(result, indexPreferences, counterRevisions)
                }

                let exportPagesObject = {};
                let finalExport = {};
                finalExport.query = parsedRequest;


                for (el in result) {
                    exportPagesObject[result[el].pageid] = result[el];
                }
                finalExport.pages = exportPagesObject;

                if (indexPreferences.edit) { //da mettere nell'if sopra
                    /////INIZIO GESTIONE REVID ELIMINATE///////
                    vediamoStart = new Date().getTime();
                    for (page in finalExport.pages) {
                        if (finalExport.pages[page].revisions === undefined) { console.log(allPagesQuery.pages[page]); return; }
                        for (revision in finalExport.pages[page].revisions.history) {
                            if (!finalExport.pages[page].revisions.history[revision].hasOwnProperty('export')) {
                                finalExport.pages[page].revisions.history[revision].export = {
                                    title: finalExport.pages[page].title,
                                    pageid: finalExport.pages[page].pageid,
                                    revid: finalExport.pages[page].revisions.history[revision].revid,
                                    sections: 'deleted revision',
                                    displaytitle: finalExport.pages[page].title
                                }
                                if (indexPreferences.nlinks || indexPreferences.listlinks) {
                                    finalExport.pages[page].revisions.history[revision].export['links'] = 'deleted revision';
                                    finalExport.pages[page].revisions.history[revision].export['externallinks'] = 'deleted revision';
                                }
                                //console.log(finalExport.pages[page].revisions.history[revision].export);
                            }
                        }
                    }
                    //console.log('tempo revid eliminate', ((new Date().getTime() - vediamoStart) / 1000));
                    /////FINE GESTIONE REVID ELIMINATE///////
                }
                /////////////////////////////////////////FINE RICERCA EXPORT/////////////////////////////////////////////////


                /////////////////////////////////////////RICERCA VIEWS/////////////////////////////////////////////////
                if (indexPreferences.views) {
                    let resultViews = await Promise.resolve(functions.getPageViews(Object.values(finalExport.pages), parsedRequest.t.split(','), resultPreview.query));
                    //console.log(resultViews);return;
                    for (el of resultViews) {
                        finalExport.pages[el.pageid].views = el.dailyViews;
                    }

                    /*for (el in finalExport.pages) {
                        console.log(finalExport.pages[el].views);
                    }*/
                }
                /////////////////////////////////////////FINE RICERCA VIEWS/////////////////////////////////////////////////

                /////////////////////////////////////////INIZIO RICERCA TALKS/////////////////////////////////////////////////
                if (indexPreferences.talks) {
                    let resultTalks = await Promise.resolve(functions.getPageTalks(Object.values(finalExport.pages), timespanArray, resultPreview.query));

                    for (el of resultTalks) {
                        finalExport.pages[el.pageid].talks = el;
                    }
                    /*for (el in finalExport.pages) {
                        console.log(finalExport.pages[el].talks);
                    }*/
                }
                /////////////////////////////////////////FINE RICERCA TALKS/////////////////////////////////////////////////

                console.log('\nInizio preparazione file');

                ///////////////////////////////////// INIZIO CALCOLO DAYS OF AGE ////////////////////////////////////////////////////
                for (el of queueFirstRevisions) {
                    //if (finalExport.pages[el.pageid] !== undefined) finalExport.pages[el.pageid].creationTimestamp = el;
                    pageDaysOfAge = Math.round((new Date(timespanArray[1]).getTime() - new Date(el.firstRevision).getTime()) / 1000 / 60 / 60 / 24);
                    if (finalExport.pages[el.pageid] !== undefined) finalExport.pages[el.pageid].daysOfAge = pageDaysOfAge;
                    //console.log(finalExport.pages[el.pageid].daysOfAge);
                }
                ///////////////////////////////////// FINE CALCOLO DAYS OF AGE ////////////////////////////////////////////////////

                finalExport.query = parsedRequest;

                wrapper.resetCounterExport();
                resolve(finalExport);
            }
        });
        //});
    });
};

module.exports.Preview = Preview;
module.exports.Info = Info;

