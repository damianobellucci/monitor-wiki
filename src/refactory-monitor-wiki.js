var bot = require('nodemw');
var wrapper = require('./wrappers.js');
var _ = require('underscore');
var fs = require('fs');
const jsonfile = require('jsonfile');
var counterPages = 0;
var counterRevisions = 0;


//MAIN
(async () => {
    try {
        let parsedRequest = parseRequest(process.argv);

        if (parsedRequest.m === 'preview') {
            let resultPreview = await wrapperPreview(parsedRequest);
            console.log('Time elapsed ' + (resultPreview.timer) / 1000 + 's', '|', resultPreview.resultofPreview + ' Pages', '|', resultPreview.revCounter + " revisions");
        }
        else if (parsedRequest.m === 'list') {
            let resultPreview = await wrapperPreview(parsedRequest);
            console.log('Time elapsed ' + (resultPreview.timer) / 1000 + 's', '|', resultPreview.resultofPreview + ' Pages', '|', resultPreview.revCounter + " revisions");

            if (!parsedRequest.e) { console.log('Error (input): -e fileName (list of pages) is required for "info" modality.'); return; }
            if (resultPreview.resultofPreview.length == 0) { console.log('Error: input file doesn\'t contain any page.'); return; }

            let finalObject = { pages: [], query: parsedRequest };

            let listResult = [];

            for (el of resultPreview.resultofPreview) {
                listResult.push({ pageid: el.pageid, title: el.title, misalignment: el.misalignment });
            }

            finalObject.pages = listResult;
            console.log(finalObject);

            fs.writeFile(parsedRequest.e, JSON.stringify(finalObject), function (err) {
                if (err) throw err;
                console.log('Page list has been saved with name: ' + parsedRequest.e);
            });
        }
        else if (parsedRequest.m === 'info') {
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
        console.log(parsedRequest);
        var mediaWikiServer;
        let answers = {};
        let answers2 = {};
        let answers3 = {};
        let answers4 = {};
        let answers5 = {};
        let answers6 = {};

        mediaWikiServer = parsedRequest.h;
        answers.query = parsedRequest.q;
        answers2.timespan = parsedRequest.t;
        answers3.nEditCriteria = parsedRequest.n;
        answers4.frequencyEditCriteria = parsedRequest.f;


        if (parsedRequest.hasOwnProperty('e')) {
            answers5.export = true;
            answers6.fileName = parsedRequest.e;
        }

        let indexPreferences = {};

        if (parsedRequest.hasOwnProperty('i')) {
            if (parsedRequest.i.includes('all')) {
                indexPreferences = { edit: true, views: true, talks: true };
            }
            else {
                if (parsedRequest.i.includes('edit')) indexPreferences.edit = true;
                if (parsedRequest.i.includes('views')) indexPreferences.views = true;
                if (parsedRequest.i.includes('comments')) indexPreferences.talks = true;
            }
        }

        let filtraDisallineate;

        if (parsedRequest.hasOwnProperty('a')) filtraDisallineate = false;
        else filtraDisallineate = true;

        //if (isNaN(answers3.nEditCriteria) || answers3.nEditCriteria < 0) { console.log('Error (nEditCriteria): ' + answers3.nEditCriteria + ' is not a valid nEditCriteria'); return; };
        //if (isNaN(answers4.frequencyEditCriteria) || answers4.frequencyEditCriteria < 0) { console.log('Error (frequencyEditCriteria): ' + answers4.frequencyEditCriteria + ' is not a valid frequencyEditCriteria'); return; };


        let info = {
            "protocol": "https",  // default to 'http'
            "server": mediaWikiServer,  // host name of MediaWiki-powered site
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
            let queue = [];
            var allPagesQuery = [];

            console.log('Inizio retrieve pagine');


            jsonfile.readFile(parsedRequest.f, async function (err, resultPreview) {
                if (resultPreview.pages.length == 0) { console.log('Error: input file doesn\'t contain any page.'); return; }

                if (err) console.error(err);

                let arrayOfPageId = [];


                for (el of resultPreview.pages) {
                    arrayOfPageId.push(el.pageid);
                }

                allPagesQuery = arrayOfPageId;
                console.log(allPagesQuery);

                let queueFirstRevisions = [];
                let chunkedAllPagesQuery = [];
                let conteggio = 0;

                console.log('Inizio retrieve data creazione delle pagine');

                if (allPagesQuery.length > 500) {//splitto

                    let chunkedAllPagesQuery = [];
                    while (allPagesQuery.length > 0) {
                        resultQueue = [];
                        chunkedAllPagesQuery = allPagesQuery.slice(0, 30);
                        for (el of chunkedAllPagesQuery) {
                            resultQueue.push(wrapper.wrapperFirstRevision(el, mediaWikiServer));
                        }
                        allPagesQuery = allPagesQuery.slice(31, allPagesQuery.length);
                        queueFirstRevisions = queueFirstRevisions.concat(await Promise.all(resultQueue));
                        conteggio += 1;
                        //console.log(conteggio);
                    }
                }
                else { //tutte assieme
                    for (el of allPagesQuery) {
                        queueFirstRevisions.push(wrapper.wrapperFirstRevision(el, mediaWikiServer));
                    }
                    queueFirstRevisions = await Promise.all(queueFirstRevisions);
                }
                console.log('Fine retrieve data creazione delle pagine');

                queueFirstRevisions = queueFirstRevisions.filter((el) => {
                    return !el.hasOwnProperty('error');
                });

                //console.log(queueFirstRevisions);

                timespanArray2 = answers2.timespan.split(',');


                timespanArray = answers2.timespan.split(',');

                timespanArray[0] = timespanArray[0].substr(0, 4) + '-' + timespanArray[0].substr(4, 2) + '-' + timespanArray[0].substr(6, 2) + 'T00:00:00.000Z';

                timespanArray[1] = timespanArray[1].substr(0, 4) + '-' + timespanArray[1].substr(4, 2) + '-' + timespanArray[1].substr(6, 2) + 'T23:59:59.999Z';



                if (new Date(timespanArray[0]) > new Date(timespanArray[1])) { console.log('Error (timespan): ' + answers2.timespan + ' is an invalid timespan.'); return };

                queueFirstRevisions = queueFirstRevisions.filter((el) => {
                    return new Date(el.firstRevision).getTime() <= new Date(timespanArray[1]).getTime(); //se la pagina è stata creata dopo del timespan end della pagina, allora non la metto tra le pagine da processare
                });



                allPagesQuery = []

                for (el of queueFirstRevisions) {
                    allPagesQuery.push(el.title);
                }

                //console.log(allPagesQuery);

                filterCriteria = { nEdit: answers3.nEditCriteria, frequencyEdit: answers4.frequencyEditCriteria };
                //console.log('vediamo'+filterCriteria.nEdit);
                console.log('Inizio retrieve revisioni delle pagine');


                //console.log(timespanArray);
                for (el of allPagesQuery) {

                    queue.push(wrapper.wrapperInfoGetParametricRevisions(getParams({ page: el, start: timespanArray[0], end: timespanArray[1] }), getParams2(el), getParams({ page: 'Talk:' + el, start: timespanArray[0], end: timespanArray[1] }), timespanArray2, filterCriteria, filtraDisallineate));
                    //queue.push(wrapper.wrapperGetParametricRevisions(getParams('Talk:' + el)));
                }

                let result = await Promise.all(queue);
                console.log('Fine retrieve revisioni delle pagine');

                //console.log(result[0]);


                /*if (!parsedRequest.hasOwnProperty('a')) {
                    result = result.filter((el) => {
                        return el.misalignment.nEdit || el.misalignment.frequencyEdit;
                    });
                }*/

                for (el of result) {//conto pagine e revisioni totali
                    counterRevisions += el.revisions.history.length;
                }


                if (result.length == 0) { console.log('Error: there aren\'t pages for the timespan ' + parsedRequest.t + '.'); return; }
                else { //DA TOGLIERE se ho messo in fondo la stringa query del nome del file export, faccio il download del file di export

                    let fileName;

                    if (!parsedRequest.d || !parsedRequest.d.replace(/\s/g, '').length) {
                        fileName = new Date().getTime().toString();
                    }
                    else fileName = parsedRequest.d;

                    exportQueue = [];
                    //per ogni elemento di result
                    //per ogni elemento di result[0].revisions.history.revid
                    console.log('Inizio retrieve informazioni delle revisioni');
                    let startExport = new Date().getTime();

                    console.log(indexPreferences);
                    if (indexPreferences.edit) {
                        for (el in result) {
                            for (rev of result[el].revisions.history) {
                                //console.log(rev);

                                exportQueue.push(wrapper.wrapperExport({
                                    action: "parse",
                                    format: "json",
                                    oldid: rev.revid,
                                    prop: "links|externallinks|sections|revid|displaytitle"
                                })/*METTERE QUI el.pageid per bindare l'export della revisione con il pageid, magari metto anche le altre info utili che ci sono nello storico revisioni e che non sono nell'export, ad esempio il timestamp...  */);
                            }
                        }
                        let resultExport = await Promise.all(exportQueue);
                        console.log('\nFine retrieve informazioni delle revisioni');

                        let newResultExport = [];
                        //console.log(resultExport);

                        for (el of resultExport) {
                            try {
                                newResultExport.push(el[0]);
                            } catch (e) {
                                //console.log(e, el);
                            }
                        }
                        //console.log(newResultExport);
                        var grouped = _.groupBy(newResultExport, function (revision) {
                            return revision.pageid;
                        });


                        delete grouped.error;
                        //console.log(grouped);


                        for (el in grouped) {
                            for (page in result) {
                                if (el == result[page].pageid) {
                                    for (elemento in result[page].revisions.history) {
                                        //console.log(grouped[el].revid, result[page].revisions.history[elemento].revid);
                                        for (revisione in grouped[el])
                                            if (grouped[el][revisione].revid == result[page].revisions.history[elemento].revid) {
                                                //console.log(grouped[el][revisione].revid, result[page].revisions.history[elemento].revid);
                                                result[page].revisions.history[elemento].export = grouped[el][revisione];
                                            }
                                    }

                                    //result[page].export = grouped[el];

                                }

                            }
                        }
                    } else {
                        for (el in result) {
                            delete result[el].revisions;
                        }
                    }
                    /////
                    //console.log(result[2].revisions.history[0]);
                    //console.log(result);
                    //////////
                    exportPagesObject = {};
                    finalExport = {};

                    finalExport.query = answers;
                    finalExport.query.timespan = { start: timespanArray[0], end: timespanArray[1] };
                    finalExport.query.misalignmentParameters = { 'nEdit': answers3, 'frequencyEdit': answers4 };

                    for (el in result) {
                        exportPagesObject[result[el].pageid] = result[el];
                    }

                    finalExport.pages = exportPagesObject;

                    //console.log(finalExport.pages['491694'].revisions.history[0].export);

                    //prendo commenti e talks di tutti gli elementi in allPagesQuery

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
                                        server: mediaWikiServer
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
                                    server: mediaWikiServer
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

                    for (el of queueFirstRevisions) {
                        if (finalExport.pages[el.pageid] !== undefined) finalExport.pages[el.pageid].creationTimestamp = el;
                    }

                    //console.log(finalExport.pages);


                    finalExport.query = parsedRequest;

                    console.log(finalExport);


                    fs.writeFile(fileName, JSON.stringify(finalExport), function (err) {

                        if (err) throw err;
                        console.log('\nThe info export has been saved with name ' + fileName);
                        wrapper.resetCounterExport();
                        wrapper.resetCounterValue();
                        resolve({ timer: new Date().getTime() - startExport });
                    });

                }
            });
        });
    });
};



function wrapperPreview(parsedRequest) { //da splittare caso erro e caso body===undefined
    return new Promise((resolve, reject) => {
        var mediaWikiServer;
        let answers = {};
        let answers2 = {};
        let answers3 = {};
        let answers4 = {};
        let answers5 = {};
        let answers6 = {};

        mediaWikiServer = parsedRequest.h;
        answers.query = parsedRequest.q;
        answers2.timespan = parsedRequest.t;
        answers3.nEditCriteria = parsedRequest.n;
        answers4.frequencyEditCriteria = parsedRequest.f;


        if (parsedRequest.hasOwnProperty('e')) {
            answers5.export = true;
            answers6.fileName = parsedRequest.e;
        }

        let indexPreferences = {};

        if (parsedRequest.hasOwnProperty('i')) {
            if (parsedRequest.i.includes('all')) {
                indexPreferences = { edit: true, views: true, talks: true };
            }
            else {
                if (parsedRequest.i.includes('edit')) indexPreferences.edit = true;
                if (parsedRequest.i.includes('views')) indexPreferences.views = true;
                if (parsedRequest.i.includes('comments')) indexPreferences.talks = true;
            }
        }

        let filtraDisallineate;

        if (parsedRequest.hasOwnProperty('a')) filtraDisallineate = false;
        else filtraDisallineate = true;

        //if (isNaN(answers3.nEditCriteria) || answers3.nEditCriteria < 0) { console.log('Error (nEditCriteria): ' + answers3.nEditCriteria + ' is not a valid nEditCriteria'); return; };
        //if (isNaN(answers4.frequencyEditCriteria) || answers4.frequencyEditCriteria < 0) { console.log('Error (frequencyEditCriteria): ' + answers4.frequencyEditCriteria + ' is not a valid frequencyEditCriteria'); return; };


        queryArray = answers.query.split(",");
        let info = {
            "protocol": "https",  // default to 'http'
            "server": mediaWikiServer,  // host name of MediaWiki-powered site
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
            let queue = [];
            var allPagesQuery = [];

            console.log('Inizio retrieve pagine');


            let inferencedQuery = [];


            //console.log(queryArray);

            for (el of queryArray) {
                let result = await wrapper.wrapperNameInference(encodeURI(el), mediaWikiServer);
                //console.log(result);

                inferencedQuery = inferencedQuery.concat(result);

            }
            //console.log(inferencedQuery);


            suggestionQueue = [];

            for (el of inferencedQuery) {
                if (el.includes('suggestion:')) suggestionQueue.push(el.replace('suggestion:', ''));
            }

            inferencedQuery = inferencedQuery.filter((el) => {
                return !el.includes('suggestion:');
            });


            let secondInferencedQuery = [];

            for (el of suggestionQueue) {
                let result = await wrapper.wrapperNameInference(encodeURI(el), mediaWikiServer);
                //console.log(result);
                secondInferencedQuery = secondInferencedQuery.concat(result.replace('suggestion:', ''));
            }

            inferencedQuery = inferencedQuery.concat(secondInferencedQuery);
            queryArray = inferencedQuery;

            //console.log(queryArray);

            //return;
            for (el of queryArray) {
                //console.log(el);
                if (el.includes('Category:') || el.includes('category:')) {
                    let categoryParams = {
                        action: 'query',
                        generator: 'categorymembers',
                        gcmtitle: el,
                        prop: 'info',
                        cllimit: 'max',
                        gcmlimit: 'max',
                        format: 'json',
                        gcmtype: 'page', /*|subcat*/
                        gcmprop: 'ids|Ctitle|Csortkey|Ctype|Ctimestamp',
                        /*gcmsort: 'timestamp',
                        gcmstart: '2002-02-02T00:00:00.000Z',
                        gcmend:'2005-02-02T00:00:00.000Z'*/
                    };
                    let allPagesOfCategory = await wrapper.wrapperGetPagesByCategory(categoryParams);
                    allPagesQuery = allPagesQuery.concat(allPagesOfCategory);
                }
                else {
                    allPagesQuery.push(await wrapper.wrapperGetPageId({ action: 'query', titles: el }));
                }

                //console.log(allPagesQuery);
            }
            console.log('Fine retrieve pagine');


            //console.log("Number of pages that match the query: " + allPagesQuery.length + "\nProcessing the results, please wait...");

            let queueFirstRevisions = [];
            let chunkedAllPagesQuery = [];
            let conteggio = 0;

            console.log('Inizio retrieve data creazione delle pagine');

            if (allPagesQuery.length > 500) {//splitto

                let chunkedAllPagesQuery = [];
                while (allPagesQuery.length > 0) {
                    resultQueue = [];
                    chunkedAllPagesQuery = allPagesQuery.slice(0, 30);
                    for (el of chunkedAllPagesQuery) {
                        resultQueue.push(wrapper.wrapperFirstRevision(el, mediaWikiServer));
                    }
                    allPagesQuery = allPagesQuery.slice(31, allPagesQuery.length);
                    queueFirstRevisions = queueFirstRevisions.concat(await Promise.all(resultQueue));
                    conteggio += 1;
                    //console.log(conteggio);
                }
            }
            else { //tutte assieme
                for (el of allPagesQuery) {
                    queueFirstRevisions.push(wrapper.wrapperFirstRevision(el, mediaWikiServer));
                }
                queueFirstRevisions = await Promise.all(queueFirstRevisions);
            }
            console.log('Fine retrieve data creazione delle pagine');

            queueFirstRevisions = queueFirstRevisions.filter((el) => {
                return !el.hasOwnProperty('error');
            });

            //console.log(queueFirstRevisions);

            timespanArray2 = answers2.timespan.split(',');


            timespanArray = answers2.timespan.split(',');

            timespanArray[0] = timespanArray[0].substr(0, 4) + '-' + timespanArray[0].substr(4, 2) + '-' + timespanArray[0].substr(6, 2) + 'T00:00:00.000Z';

            timespanArray[1] = timespanArray[1].substr(0, 4) + '-' + timespanArray[1].substr(4, 2) + '-' + timespanArray[1].substr(6, 2) + 'T23:59:59.999Z';



            if (new Date(timespanArray[0]) > new Date(timespanArray[1])) { console.log('Error (timespan): ' + answers2.timespan + ' is an invalid timespan.'); return };

            queueFirstRevisions = queueFirstRevisions.filter((el) => {
                return new Date(el.firstRevision).getTime() <= new Date(timespanArray[1]).getTime(); //se la pagina è stata creata dopo del timespan end della pagina, allora non la metto tra le pagine da processare
            });



            allPagesQuery = []

            for (el of queueFirstRevisions) {
                allPagesQuery.push(el.title);
            }

            //console.log(allPagesQuery);

            filterCriteria = { nEdit: answers3.nEditCriteria, frequencyEdit: answers4.frequencyEditCriteria };
            //console.log('vediamo'+filterCriteria.nEdit);
            console.log('Inizio retrieve revisioni delle pagine');


            //console.log(timespanArray);
            for (el of allPagesQuery) {

                queue.push(wrapper.wrapperGetParametricRevisions(getParams({ page: el, start: timespanArray[0], end: timespanArray[1] }), getParams2(el), getParams({ page: 'Talk:' + el, start: timespanArray[0], end: timespanArray[1] }), timespanArray2, filterCriteria, filtraDisallineate));
                //queue.push(wrapper.wrapperGetParametricRevisions(getParams('Talk:' + el)));
            }

            let result = await Promise.all(queue);
            console.log('Fine retrieve revisioni delle pagine');

            //console.log(result[0]);


            if (!parsedRequest.hasOwnProperty('a')) {
                result = result.filter((el) => {
                    return el.misalignment.nEdit || el.misalignment.frequencyEdit;
                });
            }

            for (el of result) {//conto pagine e revisioni totali
                counterRevisions += el.revisions.history.length;
            }

            //console.log(result);

            //wrapper.resetCounterValue();


            //console.log(result);
            resolve({ resultofPreview: result, revCounter: counterRevisions, timer: new Date().getTime() - start });
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

function parseRequest(processArgv) {
    let arguments = processArgv.slice(2);
    let stringArguments = [];
    let requestObject = {};

    for (let el of arguments) {
        stringArguments += el + ' ';
    }
    arguments = stringArguments.split('-');

    for (let el in arguments) {
        arguments[el] = arguments[el].slice(0, arguments[el].length - 1);
    }

    for (let el in arguments) {
        if (arguments[el] === '');
        else if (arguments[el] === 'a') requestObject[arguments[el]] = '';
        else {
            requestObject[arguments[el].slice(0, 1)] = arguments[el].slice(2);
        }
    }
    return requestObject;
}

var conteggioRevisioni = function counterRevions() {
    return counterRevisions;
}
module.exports.conteggioRevisioni = conteggioRevisioni;