var bot = require('nodemw');
var fs = require('fs');
const jsonfile = require('jsonfile');
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
            let queueFirstRevisions = await Promise.resolve(functions.searchFirstRevision(parsedRequest, timespanArray, allPagesQuery));
            allPagesQuery = []
            for (el of queueFirstRevisions) {
                allPagesQuery.push(el.title);
            }
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

            let counterRevisions = 0;

            for (el of revisions) {
                counterRevisions += el.revisions.history.length;
            }

            resolve({ numberOfPages: { all: allPagesQuery.length, misaligned: misalignedPages.length }, resultofPreview: revisions, revCounter: counterRevisions, timer: new Date().getTime() - start });
        });
    });
};

async function Info(parsedRequest) { //da splittare caso erro e caso body===undefined
    return new Promise((resolve, reject) => {

        console.log('Lettura file di input');
        jsonfile.readFile(parsedRequest.f, async function (err, resultPreview) {
            if (err) { console.log('Error (file input): invalid file.'); return; }
            if (resultPreview.pages.length == 0) { console.log('Error: input file doesn\'t contain any page.'); return; }
            console.log('Lettura file di input completata');

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
            } catch (e) { return; };

            client.logIn(async error => {

                if (error) {
                    console.log(error);
                    return;
                }
                let queue = [];
                var allPagesQuery = [];

                console.log('Inizio ricerca pagine');

                let arrayOfPageId = [];

                for (el of resultPreview.pages) {
                    arrayOfPageId.push(el.pageid);
                }

                allPagesQuery = arrayOfPageId;


                let timespanArray = parsedRequest.t.split(',');
                timespanArray[0] = timespanArray[0].substr(0, 4) + '-' + timespanArray[0].substr(4, 2) + '-' + timespanArray[0].substr(6, 2) + 'T00:00:00.000Z';
                timespanArray[1] = timespanArray[1].substr(0, 4) + '-' + timespanArray[1].substr(4, 2) + '-' + timespanArray[1].substr(6, 2) + 'T23:59:59.999Z';

                console.log('Inizio retrieve data creazione delle pagine');

                parsedRequest.h = resultPreview.query.h;

                let queueFirstRevisions = await Promise.resolve(functions.searchFirstRevision(parsedRequest, timespanArray, allPagesQuery));

                allPagesQuery = []

                for (el of queueFirstRevisions) {
                    allPagesQuery.push(el.title);
                }

                console.log('Inizio retrieve revisioni delle pagine');

                let start = new Date().getTime();

                let result = await Promise.resolve(functions.searchRevisions(parsedRequest, timespanArray, allPagesQuery));

                let counterRevisions = 0;

                //conto revisioni totali
                for (el of result) {
                    counterRevisions += el.revisions.history.length;
                }

                console.log('Time elapsed ' + (new Date().getTime() - start) / 1000 + 's', '|', result.length, 'total pages', '|', counterRevisions + " revisions");


                if (result.length == 0) { console.log('Error: there aren\'t pages for the timespan ' + parsedRequest.t + '.'); return; }
                else {

                    console.log('Inizio retrieve informazioni delle revisioni');
                    let startExport = new Date().getTime();

                    let indexPreferences = functions.getIndexFlagPreferences(parsedRequest);


                    /////////////////////////////////////////INIZIO RETRIEVE EXPORT/////////////////////////////////////////////////
                    if (indexPreferences.edit) {
                        result = await functions.getPageExport(result, indexPreferences, counterRevisions)
                    }

                    let exportPagesObject = {};
                    let finalExport = {};
                    for (el in result) {
                        exportPagesObject[result[el].pageid] = result[el];
                    }
                    finalExport.pages = exportPagesObject;

                    if (indexPreferences.edit) { //da mettere nell'if sopra
                        /////INIZIO GESTIONE REVID ELIMINATE///////
                        vediamoStart = new Date().getTime();
                        for (page in finalExport.pages) {
                            if (finalExport.pages[page].revisions === undefined) { console.log(finalExport.pages[page]); return; }
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
                    /////////////////////////////////////////FINE RETRIEVE EXPORT/////////////////////////////////////////////////


                    /////////////////////////////////////////RETRIEVE VIEWS/////////////////////////////////////////////////

                    if (indexPreferences.views) {

                        let resultViews = await Promise.resolve(functions.getPageViews(finalExport, parsedRequest.t.split(','), resultPreview));
                        for (el of resultViews) {
                            finalExport.pages[el.pageid].views = el.dailyViews;
                        }
                        /*for (el in finalExport.pages) {
                            console.log(finalExport.pages[el].views);
                        }*/
                    }
                    /////////////////////////////////////////FINE RETRIEVE VIEWS/////////////////////////////////////////////////

                    /////////////////////////////////////////INIZIO RETRIEVE TALKS/////////////////////////////////////////////////
                    if (indexPreferences.talks) {
                        let resultTalks = await Promise.resolve(functions.getPageTalks(finalExport, timespanArray, resultPreview));

                        for (el of resultTalks) {
                            finalExport.pages[el.pageid].talks = el;
                        }
                        /*for (el in finalExport.pages) {
                            console.log(finalExport.pages[el].talks);
                        }*/
                    }
                    /////////////////////////////////////////FINE RETRIEVE TALKS/////////////////////////////////////////////////

                    console.log('Inizio preparazione file di export');

                    ///////////////////////////////////// INIZIO CALCOLO DAYS OF AGE ////////////////////////////////////////////////////
                    for (el of queueFirstRevisions) {
                        //if (finalExport.pages[el.pageid] !== undefined) finalExport.pages[el.pageid].creationTimestamp = el;
                        pageDaysOfAge = Math.round((new Date(timespanArray[1]).getTime() - new Date(el.firstRevision).getTime()) / 1000 / 60 / 60 / 24);
                        if (finalExport.pages[el.pageid] !== undefined) finalExport.pages[el.pageid].daysOfAge = pageDaysOfAge;
                        //console.log(finalExport.pages[el.pageid].daysOfAge);
                    }
                    ///////////////////////////////////// FINE CALCOLO DAYS OF AGE ////////////////////////////////////////////////////

                    finalExport.query = parsedRequest;

                    fs.writeFile(parsedRequest.d, JSON.stringify(finalExport), function (err) {
                        
                        if (err) throw err;

                        console.log('\nThe info export has been saved with name ' + parsedRequest.d);
                        
                        resolve({ timer: new Date().getTime() - startExport });
                    });
                }
            });
        });
    });
};

module.exports.Preview = Preview;
module.exports.Info = Info;