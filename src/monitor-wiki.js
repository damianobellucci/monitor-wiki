var bot = require('nodemw');
var wrapper = require('./wrappers.js');
var _ = require('underscore');
var fs = require('fs');
const jsonfile = require('jsonfile');
var counterPages = 0;
var counterRevisions = 0;

//let queryArgs = process.argv.slice(2);
//let modality = queryArgs[0];
//console.log(queryArgs);

let parsedRequest = parseRequest(process.argv);

//console.log(parsedRequest);

if (parsedRequest.m === 'export') {
    //if (queryArgs.length < 6 || queryArgs.length > 7) { console.log('Error (n. parameters): invalid number of parameters for the export.'); return; };

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

        console.log('Time elapsed ' + (new Date().getTime() - start) / 1000 + 's', '|', result.length + ' Pages', '|', counterRevisions + " revisions");
        //wrapper.resetCounterValue();


        //console.log(result);


        if (answers6.fileName && result.length > 0) { //se ho messo in fondo la stringa query del nome del file export, faccio il download del file di export

            let fileName;

            if (answers6.fileName.length == 0 || !answers6.fileName.replace(/\s/g, '').length) {
                fileName = new Date().getTime().toString();
            }
            else fileName = answers6.fileName;

            exportQueue = [];
            //per ogni elemento di result
            //per ogni elemento di result[0].revisions.history.revid
            console.log('Inizio retrieve informazioni delle revisioni');
            let startExport = new Date().getTime();

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

            //console.log(finalExport);

            finalExport.query.parsedRequest = parsedRequest;

            fs.writeFile(fileName, JSON.stringify(finalExport), function (err) {

                if (err) throw err;
                console.log('\nThe export has been saved');
                console.log('Time elapsed for export: ' + (new Date().getTime() - startExport) / 1000 + 's');
                wrapper.resetCounterExport();
                wrapper.resetCounterValue();
            });

        }
    });
}
else if (parsedRequest.m === 'analyze') {
    //if (queryArgs.length != 4) { console.log('Error (n. parameters): invalid number of parameters for the export.'); return; };



    ////console.log(queryArgs);
    let choosedFile = { selectFile: parsedRequest.f };
    let choosedTimespan = { timespan: parsedRequest.t };
    let nameExportFile = { fileName: parsedRequest.d };

    jsonfile.readFile(choosedFile.selectFile, function (err, obj) {
        if (err) console.error(err);

        let indexPreferences = {};

        if (obj.query.parsedRequest.hasOwnProperty('i')) {
            if (obj.query.parsedRequest.i.includes('all')) {
                indexPreferences = { edit: true, views: true, talks: true };
            }
            else {
                if (obj.query.parsedRequest.i.includes('edit')) indexPreferences.edit = true;
                if (obj.query.parsedRequest.i.includes('views')) indexPreferences.views = true;
                if (obj.query.parsedRequest.i.includes('comments')) indexPreferences.talks = true;
            }
        }

        choosedTimespan = choosedTimespan.timespan.split(",");

        filterTimespan = [];

        filterTimespan[0] = choosedTimespan[0].substr(0, 4) + '-' + choosedTimespan[0].substr(4, 2) + '-' + choosedTimespan[0].substr(6, 2) + 'T00:00:00.000Z';

        filterTimespan[1] = choosedTimespan[1].substr(0, 4) + '-' + choosedTimespan[1].substr(4, 2) + '-' + choosedTimespan[1].substr(6, 2) + 'T23:59:59.999Z';

        millisecondStart = new Date(filterTimespan[0]).getTime();
        millisecondEnd = new Date(filterTimespan[1]).getTime();

        //console.log(millisecondStart, millisecondEnd);

        finalObject = {};

        //console.log(obj.pages['59506224'].views);
        for (el in obj.pages) {

            finalObject[el] = { pageid: obj.pages[el].pageid, title: obj.pages[el].title, edit: { history: [] }, views: [], talks: { history: [] } };


            if (!indexPreferences.edit) delete (finalObject[el].edit);
            if (!indexPreferences.views) delete (finalObject[el].views);
            if (!indexPreferences.talks) delete (finalObject[el].talks);


            if (indexPreferences.edit) {

                //fetch delle edit//////////
                for (rev of obj.pages[el].revisions.history) {
                    if (new Date(rev.timestamp) >= millisecondStart && new Date(rev.timestamp) <= millisecondEnd) {
                        finalObject[el].edit.history.push(rev);
                    }
                }
                finalObject[el].edit.count = finalObject[el].edit.history.length;
            }
            ////////////////////////////

            //fetch delle views/////////
            try {
                if (obj.pages[el].views === 'Not Available') finalObject[el].views = 'Not Available';
                else {
                    for (dailyView in obj.pages[el].views) {
                        //console.log(obj.pages[el].views[dailyView]);

                        //obj.pages[el].views[dailyView].timestamp = obj.pages[el].views[dailyView].timestamp.substr(0, 4) + '-' + obj.pages[el].views[dailyView].timestamp.substr(4, 2) + '-' + obj.pages[el].views[dailyView].timestamp.substr(6, 2) + 'T23:59:59.999Z';

                        //console.log(obj.pages[el].views[dailyView].timestamp);

                        let app = obj.pages[el].views[dailyView].timestamp.substr(0, 4) + '-' + obj.pages[el].views[dailyView].timestamp.substr(4, 2) + '-' + obj.pages[el].views[dailyView].timestamp.substr(6, 2) + 'T23:59:59.999Z';

                        if (new Date(app) >= millisecondStart && new Date(app) <= millisecondEnd) {
                            finalObject[el].views.push(obj.pages[el].views[dailyView]);
                            //console.log(dailyView);

                        }
                    }
                }
            } catch (e) {
                console.log(e);
                return;
            }
            /////////////////////////////

            ///fetch dei talks///////////////////
            if (indexPreferences.talks) {
                for (talk in obj.pages[el].talks.history) {

                    if (new Date(obj.pages[el].talks.history[talk].timestamp) >= millisecondStart && new Date(obj.pages[el].talks.history[talk].timestamp) <= millisecondEnd) {
                        //console.log(obj.pages[el].talks.history[talk]);
                        finalObject[el].talks.history.push(obj.pages[el].talks.history[talk]);
                    }

                }
                finalObject[el].talks.count = finalObject[el].talks.history.length;
            }
            ///fetch dei talks///////////////////

            let max = { timestamp: -1 };
            //if (obj.pages[el].revisions.count > 0) max.timestamp = -1 /*obj.pages[el].revisions.history[0]*/;

            if (indexPreferences.edit) {
                for (rev of obj.pages[el].revisions.history) {
                    if (new Date(rev.timestamp) > new Date(max.timestamp) && new Date(rev.timestamp) <= millisecondEnd) {
                        max = rev;
                    }
                }

                //console.log(max);
                if (max.timestamp == -1) max = {};
                finalObject[el].puntualStatistics = max;
            }

            //console.log(obj.pages[el].creationTimestamp.firstRevision);
            finalObject[el].puntualDaysOfAge = Math.round((millisecondEnd - new Date(obj.pages[el].creationTimestamp.firstRevision)) / (1000 * 60 * 60 * 24));

            finalObject[el].misalignment = { misalignmentParameters: obj.query.misalignmentParameters, misalignmentResult: obj.pages[el].misalignment };
        }
        //console.log(finalObject['59506224'].views[0]);

        //trovo ultima revisione della pagina per retrieve delle statistiche

        //console.log(finalObject['59506224'].talks.history[0]);
        //console.log(obj.pages['59506224']);

        //console.log(obj.pages);
        //console.log(finalObject);

        let analizeFileName;

        if (nameExportFile.fileName == 0 || !nameExportFile.fileName.replace(/\s/g, '').length) {
            analizeFileName = new Date().getTime().toString();
        }
        else analizeFileName = nameExportFile.fileName;

        fs.writeFile(analizeFileName, JSON.stringify(finalObject), function (err) {

            if (err) throw err;
            console.log('The export has been saved with name: ' + analizeFileName);
        });
    });
}
else {
    console.log('Error: it was written ' + modality + ', but the available modality are only export and analyze.');
}






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
