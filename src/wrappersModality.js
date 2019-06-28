var bot = require('nodemw');
var fs = require('fs');
const jsonfile = require('jsonfile');
var functions = require('./functions.js');
var wrapper = require('./wrappers.js');
const _ = require('underscore');
var counterPagesCreatedInTimespan = 0;
var counterPagesBeforeTimespanFilter = 0;
var counterSingleRevisions = 0;


async function Preview(parsedRequest) { //da splittare caso erro e caso body===undefined
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

            let timespanArray = functions.ConvertYYYYMMDDtoISO(parsedRequest.t);

            ///////////////////////////////////////// RICERCA DATA CREAZIONE PAGINE /////////////////////////////////////////
            //Per determinare se una pagina è stata creata all'interno del timespan (flag -t) e quindi includerlo
            //nella ricerca, ho bisogno della data di creazione della pagina
            console.log('\n' + 'Tot. pagine prima della cernita (prima revisione):', pagesId.length);

            counterPagesBeforeTimespanFilter = pagesId.length;

            let objectFirstRevision = await Promise.resolve(functions.searchFirstRevision(timespanArray, pagesId));

            let infoPagesCreatedInTimespan = objectFirstRevision.pagesCreatedInTimespan;

            counterPagesCreatedInTimespan = infoPagesCreatedInTimespan.length;

            console.log('\n' + 'Tot. pagine dopo la cernita (prima revisione):', infoPagesCreatedInTimespan.length);
            ///////////////////////////////////////// FINE DATA CREAZIONE PAGINE /////////////////////////////////////////

            ///////////////////////////////////////// RICERCA REVISIONI PAGINE /////////////////////////////////////////
            let revisions = [];

            if (parsedRequest.hasOwnProperty('n') || parsedRequest.hasOwnProperty('f')) revisions = await Promise.resolve(functions.searchRevisions(timespanArray, infoPagesCreatedInTimespan.map(pageInfo => pageInfo.title)));
            ///////////////////////////////////////// FINE REVISIONI PAGINE /////////////////////////////////////////

            ///////////////////////////////////////// RICERCA COMMENTI PAGINE /////////////////////////////////////////
            let talksPagesInfo = [];
            if (parsedRequest.hasOwnProperty('c')) talksPagesInfo = await Promise.resolve(functions.getPageTalks(infoPagesCreatedInTimespan, timespanArray));
            ///////////////////////////////////////// FINE COMMENT PAGINE /////////////////////////////////////////

            ///////////////////////////////////////// INZIO RICERCA VIEWS PAGINE /////////////////////////////////////////
            let viewsPagesInfo = [];
            if (parsedRequest.hasOwnProperty('v')) viewsPagesInfo = await Promise.resolve(functions.getPageViews(infoPagesCreatedInTimespan, parsedRequest.t.split(','), parsedRequest));
            ///////////////////////////////////////// FINE RICERCA VIEWS PAGINE /////////////////////////////////////////

            ///////////////////////////////////////// INZIO RICOMBINAZIONE /////////////////////////////////////////

            let recombinedObject = functions.RecombineResultPreview(infoPagesCreatedInTimespan, revisions, talksPagesInfo, viewsPagesInfo, parsedRequest);

            ///////////////////////////////////////// FINE RICOMBINAZIONE ////////////////////////////////////////

            ///////////////////////////////////////// INZIO AGGREGAZIONE /////////////////////////////////////////

            let aggregatedObject = functions.AggregateResultPreview(recombinedObject, parsedRequest);

            ///////////////////////////////////////// FINE AGGREGAZIONE /////////////////////////////////////////

            ///////////////////////////////////////// INIZIO TAG DISALLINEATE/NON DISALLINEATE /////////////////////////////////////////

            aggregatedObject = functions.TagArticlesPreview(aggregatedObject, parsedRequest);

            ///////////////////////////////////////// FINE TAG DISALLINEATE/NON DISALLINEATE /////////////////////////////////////////

            ///////// se non c'è flag -a tolgo dal risultato le pagine non disallineate
            if (!parsedRequest.hasOwnProperty('a'))
                for (let page in aggregatedObject) {
                    !aggregatedObject[page].misalignment.isMisaligned ? delete (aggregatedObject[page]) : null;
                }
            ///////////////////////////////////////// INIZIO STAMPA /////////////////////////////////////////

            functions.PrintResultPreview(aggregatedObject, start, pagesCreatedInTimespan.length);

            ///////////////////////////////////////// FINE STAMPA /////////////////////////////////////////

            wrapper.resetCounterDataCreazione();
            wrapper.resetcounterDownloadedViews();
            wrapper.resetcounterTalks();
            wrapper.resetcounterRevision();

            resolve(aggregatedObject);
        });
    });
};

async function Info(parsedRequest) {
    return new Promise(async (resolve, reject) => {

        console.log('\n>>>Inizio lettura file di input ('+ parsedRequest.f+")");

        let resultPreview = JSON.parse((await functions.readFile('../results/' + parsedRequest.f)));

        if (resultPreview.pages.length == 0) { console.log('Error: input file doesn\'t contain any page.'); return; }
        console.log('\nFine lettura file di input');

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


            var allPagesQuery = [];

            let arrayOfPageId = [];


            for (let page in resultPreview.pages) {
                arrayOfPageId.push(page);
            }

            allPagesQuery = arrayOfPageId;


            let timespanArray = functions.ConvertYYYYMMDDtoISO(parsedRequest.t);

            parsedRequest.h = resultPreview.query.h;

            counterPagesBeforeTimespanFilter = allPagesQuery.length;
            //elimino quelli con id undefined
            let objectFirstRevision = await Promise.resolve(functions.searchFirstRevision(timespanArray, allPagesQuery));

            let queueFirstRevisions = objectFirstRevision.pagesCreatedInTimespan;

            counterPagesCreatedInTimespan = queueFirstRevisions.length;

            allPagesQuery = []

            for (el of queueFirstRevisions) {
                allPagesQuery.push(el.title);
            }

            let start = new Date().getTime();

            let result = await Promise.resolve(functions.searchRevisions(timespanArray, allPagesQuery));

            let counterRevisions = 0;

            //conto revisioni totali
            for (el of result) {
                counterRevisions += el.revisions.history.length;
            }

            console.log('\n' + 'Time elapsed ' + (new Date().getTime() - start) / 1000 + 's', '|', result.length, 'total pages', '|', counterRevisions + " revisions");


            if (result.length == 0) { console.log('Error: there aren\'t pages for the timespan ' + parsedRequest.t + '.'); return; }
            else {

                let indexPreferences = functions.getIndexFlagPreferences(parsedRequest);


                /////////////////////////////////////////INIZIO RICERCA EXPORT/////////////////////////////////////////////////

                console.log('\nInizio ricerca informazioni delle revisioni\n');

                if (indexPreferences.nlinks || indexPreferences.listlinks) {
                    result = await functions.getPageExport(result, indexPreferences, counterRevisions);

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

                /////////////////////////////////////////INIT ANNOTATED HISTORY/////////////////////////////////////////////////
                
                let resultAnnotatedHistory = await Promise.resolve(functions.getAnnotatedHistories(Object.values(finalExport.pages), parsedRequest));
                
                for (ah of resultAnnotatedHistory) {
                		finalExport.pages[ah.pageid].annotatedHistory = ah.annotatedHistory;
                }
                
                /////////////////////////////////////////END ANNOTATED HISTORY/////////////////////////////////////////////////
                
                
                
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

                console.log('\nInizio preparazione file (finalExport)');

                ///////////////////////////////////// INIZIO CALCOLO DAYS OF AGE ////////////////////////////////////////////////////

                finalExport = functions.CalculateDaysOfAgeInfo(queueFirstRevisions, finalExport, timespanArray);

                ///////////////////////////////////// FINE CALCOLO DAYS OF AGE ////////////////////////////////////////////////////


                finalExport = functions.InsertNotYetCreatedPagesInfo(objectFirstRevision, finalExport);


                finalExport.query = parsedRequest;

                wrapper.resetCounterExport();

                wrapper.resetCounterDataCreazione();
                wrapper.resetcounterDownloadedViews();
                wrapper.resetcounterTalks();
                wrapper.resetcounterRevision();

                resolve(finalExport);
            }
        });
    });
};

function pageCounterCreatedInTimespan() {
    return counterPagesCreatedInTimespan;
}

function pageCounterPagesBeforeTimespanFilter() {
    return counterPagesBeforeTimespanFilter;
}

function singleRevisionsCounter() {
    return counterSingleRevisions;
}



module.exports.Preview = Preview;
module.exports.Info = Info;
module.exports.pageCounterCreatedInTimespan = pageCounterCreatedInTimespan;
module.exports.pageCounterPagesBeforeTimespanFilter = pageCounterPagesBeforeTimespanFilter;
module.exports.singleRevisionsCounter = singleRevisionsCounter;


