var bot = require('nodemw');
var wrapper = require('./wrappers.js');
var _ = require('underscore');
var fs = require('fs');
const jsonfile = require('jsonfile');
var counterPages = 0;
var functions = require('./functions.js');
var wrappersModality = require('./wrappersModality.js');



//MAIN
(async () => {
    try {
        let parsedRequest = functions.parseRequest(process.argv);

        if (parsedRequest.m === 'preview') {
            if (parsedRequest.n && parsedRequest.f) { console.log('Error (input): only one of n.Edit or frequencyEdit is required.'); return; }
            let resultPreview = await wrappersModality.Preview(parsedRequest);
            console.log('Time elapsed ' + (resultPreview.timer) / 1000 + 's', '|', resultPreview.numberOfPages.misaligned, 'misaligned pages', '/', resultPreview.numberOfPages.all, 'total pages', '|', resultPreview.revCounter + " revisions");
        }
        else if (parsedRequest.m === 'list') {
            if (!parsedRequest.n && !parsedRequest.f) { console.log('Error (input): n.Edit or frequencyEdit is required.'); return; }
            if (parsedRequest.n && parsedRequest.f) { console.log('Error (input): only one of n.Edit or frequencyEdit is required.'); return; }
            if (!parsedRequest.e) { console.log('Error (input): -e flag is required for "info" modality.'); return; }

            let resultPreview = await wrappersModality.Preview(parsedRequest);
            console.log('Time elapsed ' + (resultPreview.timer) / 1000 + 's', '|', resultPreview.numberOfPages.misaligned, 'misaligned pages', '/', resultPreview.numberOfPages.all, 'total pages', '|', resultPreview.revCounter + " revisions");

            if (resultPreview.resultofPreview.length == 0) { console.log('No pages for the query.'); return; }

            let finalObject = { pages: [], query: parsedRequest };

            let listResult = [];

            for (el of resultPreview.resultofPreview) {
                listResult.push({ pageid: el.pageid, title: el.title, misalignment: el.misalignment });
            }

            finalObject.pages = listResult;
            //console.log(finalObject);

            fs.writeFile(parsedRequest.e, JSON.stringify(finalObject), function (err) {
                if (err) throw err;
                console.log('Page list has been saved with name: ' + parsedRequest.e);
            });
        }
        else if (parsedRequest.m === 'info') {
            if (!parsedRequest.f) { console.log('Error (input): missing input file.'); return; }
            //if (new Date(timespanArray[0]) > new Date(timespanArray[1])) { console.log('Error (timespan): ' + parsedRequest.t + ' is an invalid timespan.'); return };

            //if (isNaN(parsedRequest.n) || parsedRequest.n < 0) { console.log('Error (nEditCriteria): ' + parsedRequest.n + ' is not a valid nEditCriteria'); return; };
            //if (isNaN(parsedRequest.f) || parsedRequest.f < 0) { console.log('Error (frequencyEditCriteria): ' + parsedRequest.f + ' is not a valid frequencyEditCriteria'); return; };
            let resultInfo = await wrapperInfo(parsedRequest);
            console.log('Time elapsed for export: ' + resultInfo.timer / 1000 + 's');
        }
    }
    catch (e) {
        console.log(e);
    }

})();


async function wrapperInfo(parsedRequest) { //da splittare caso erro e caso body===undefined
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

                let timespanArray2 = parsedRequest.t.split(',');

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

                    let indexPreferences = functions.getIndexFlagPreferences(parsedRequest);

                    console.log('Inizio retrieve informazioni delle revisioni');

                    let startExport = new Date().getTime();


                    let finalExport = {};


                    if (indexPreferences.edit) {
                        result = await functions.getPageExport(result, indexPreferences, counterRevisions);
                        let exportPagesObject = {};
                        for (el in result) {
                            exportPagesObject[result[el].pageid] = result[el];
                        }
                        finalExport.pages = exportPagesObject;

                        /////INIZIO GESTIONE REVID ELIMINATE///////
                        //vediamoStart = new Date().getTime();
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
                                    console.log(finalExport.pages[page].revisions.history[revision].export);
                                }
                            }
                        }
                        //console.log('tempo revid eliminate', ((new Date().getTime() - vediamoStart) / 1000));
                        /////FINE GESTIONE REVID ELIMINATE///////
                    } else {
                        for (el in result) {
                            delete result[el].revisions;
                        }
                    }

                    /////////////////////////////////////////RETRIEVE VIEWS/////////////////////////////////////////////////

                    if (indexPreferences.views) {
                        let queueViews = [];
                        let resultViews = [];
                        let conta = 0;

                        console.log('Inizio retrieve views relative alle pagine');

                        //console.log(Object.keys(finalExport.pages).length);
                        if (Object.keys(finalExport.pages).length > 500) {
                            //ottengo array con tutte le pagine


                            let arrayOfPagesId = [];
                            for (elId in finalExport.pages) {
                                arrayOfPagesId.push(elId);
                            }
                            //console.log('\narrayOfPagesId',arrayOfPagesId.length);

                            while (arrayOfPagesId.length > 0) {
                                //console.log('\narrayOfPagesId', arrayOfPagesId.length);

                                conta += 1;
                                //console.log(conta);
                                queueViews = [];
                                chunkedArrayOfPagesId = arrayOfPagesId.slice(0, 25);
                                //wrappo
                                for (elIdOfChuncked of chunkedArrayOfPagesId) {
                                    queueViews.push(wrapper.wrapperViews({
                                        pageTitle: finalExport.pages[elIdOfChuncked].title,
                                        pageid: finalExport.pages[elIdOfChuncked].pageid,
                                        start: timespanArray2[0],
                                        end: timespanArray2[1],
                                        server: resultPreview.query.h
                                    }));
                                }
                                arrayOfPagesId = arrayOfPagesId.slice(26, arrayOfPagesId.length);
                                resultViews = resultViews.concat(await Promise.all(queueViews));

                            }

                        } else {
                            for (elPageId in finalExport.pages) {
                                //console.log(finalExport.pages[elPageId].title);

                                //console.log(queryArray[0],queryArray[1]);
                                queueViews.push(wrapper.wrapperViews({
                                    pageTitle: finalExport.pages[elPageId].title,
                                    pageid: finalExport.pages[elPageId].pageid,
                                    start: timespanArray2[0],
                                    end: timespanArray2[1],
                                    server: resultPreview.query.h
                                }));
                            }
                            resultViews = await Promise.all(queueViews);
                            //console.log(resultViews);
                        }
                        console.log('Fine retrieve views relative alle pagine');

                        //console.log(resultViews);

                        for (el of resultViews) {
                            finalExport.pages[el.pageid].views = el.dailyViews;
                        }
                        for (el in finalExport.pages) {
                            //console.log(finalExport.pages[el].views);
                        }
                        ///////////////////////////////////////////////////////////////

                        //console.log(finalExport.pages['1164'].revisions);
                    }
                    /////////RETRIEVE TALKS/////////////////////////

                    if (indexPreferences.talks) {
                        queueTalks = [];
                        console.log('Inizio retrieve talks delle pagine');
                        for (elPageId in finalExport.pages) {
                            //console.log(finalExport.pages[elPageId].title);
                            queueTalks.push(wrapper.wrapperTalks(
                                {
                                    action: 'query',
                                    prop: 'revisions',
                                    rvprop: ['ids', 'timestamp', 'size', 'flags', 'comment', 'user'].join('|'),
                                    rvdir: 'newer', // order by timestamp ascz
                                    rvlimit: 'max',
                                    titles: 'Talk:' + finalExport.pages[elPageId].title,
                                    rvstart: timespanArray[0],
                                    rvend: timespanArray[1]
                                }
                                ,
                                finalExport.pages[elPageId].pageid
                            ));
                        }
                        let resultTalks = await Promise.all(queueTalks);
                        console.log('Fine retrieve talks delle pagine');

                        console.log('Inizio preparazione file di export');

                        ////console.log(resultTalks[0]);
                        for (el of resultTalks) {
                            finalExport.pages[el.pageid].talks = el;
                        }
                        /*for (el in finalExport.pages) {
                            console.log(finalExport.pages[el].talks);
                        }*/
                    }

                    ///////////////////////////////////// INIZIO CALCOLO DAYS OF AGE ////////////////////////////////////////////////////
                    for (el of queueFirstRevisions) {
                        //if (finalExport.pages[el.pageid] !== undefined) finalExport.pages[el.pageid].creationTimestamp = el;
                        pageDaysOfAge = Math.round((new Date(timespanArray[1]).getTime() - new Date(el.firstRevision).getTime()) / 1000 / 60 / 60 / 24);
                        if (finalExport.pages[el.pageid] !== undefined) finalExport.pages[el.pageid].daysOfAge = pageDaysOfAge;
                        //console.log(finalExport.pages[el.pageid].daysOfAge);
                    }
                    ///////////////////////////////////// FINE CALCOLO DAYS OF AGE ////////////////////////////////////////////////////


                    ///console.log(finalExport.pages);


                    finalExport.query = parsedRequest;

                    //console.log(finalExport);


                    fs.writeFile(parsedRequest.d, JSON.stringify(finalExport), function (err) {

                        if (err) throw err;
                        console.log('\nThe info export has been saved with name ' + parsedRequest.d);
                        wrapper.resetCounterExport();
                        wrapper.resetCounterValue();
                        resolve({ timer: new Date().getTime() - startExport });
                    });

                }
            });
        });
    });
};



var getParamsExport = revid => {
    params = {
        action: "parse",
        format: "json",
        oldid: revid,
        prop: "links|externallinks|sections|revid|displaytitle"
    }
    return params;
}


var getParams2 = page => {
    params = {
        action: 'query',
        prop: 'categories',
        titles: page,
        cllimit: 'max'
    }
    return params;
}

var getParams = (info) => {
    params = {
        action: 'query',
        prop: 'revisions',
        rvprop: ['ids', 'timestamp', 'size', 'flags', 'comment', 'user'].join('|'),
        rvdir: 'newer', // order by timestamp asc
        rvlimit: 'max',
        titles: info.page,
        rvstart: info.start,
        rvend: info.end
    }
    return params;
}
