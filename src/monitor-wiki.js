var bot = require('nodemw');
var wrapper = require('./wrappers.js');
var _ = require('underscore');
var fs = require('fs');
const jsonfile = require('jsonfile');

let queryArgs = process.argv.slice(2);
let modality = queryArgs[0];

if (modality === 'export') {
    let answers = {};
    let answers2 = {};
    let answers3 = {};
    let answers4 = {};
    let answers5 = {};
    let answers6 = {};

    answers.query = queryArgs[1];
    answers2.timespan = queryArgs[2];
    answers3.nEditCriteria = queryArgs[3];
    answers4.frequencyEditCriteria = queryArgs[4];
    answers5.export = true;
    answers6.fileName = queryArgs[5];

    queryArray = answers.query.split(",");
    let info = {
        "protocol": "https",  // default to 'http'
        "server": "en.wikipedia.org",  // host name of MediaWiki-powered site
        "path": "/w",                  // path to api.php script
        "debug": false,                // is more verbose when set to true
        "username": "Monitorwikibotdb",             // account to be used when logIn is called (optional)
        "password": "Slart1bartfastW",             // password to be used when logIn is called (optional)
        "userAgent": "belluccidamiano@gmail.com",      // define custom bot's user agent
        "concurrency": 100               // how many API requests can be run in parallel (defaults to 3)
    }

    let start = new Date().getTime();

    client = new bot(info);

    client.logIn(async error => {

        if (error) {
            console.log(error);
            return;
        }
        let queue = [];
        var allPagesQuery = [];

        for (el of queryArray) {
            //console.log(el);
            if (el.includes('Category:')) {
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

        //console.log("Number of pages that match the query: " + allPagesQuery.length + "\nProcessing the results, please wait...");

        let queueFirstRevisions = [];
        let chunkedAllPagesQuery = [];
        let conteggio = 0;

        if (allPagesQuery.length > 500) {//splitto

            let chunkedAllPagesQuery = [];
            while (allPagesQuery.length > 0) {
                resultQueue = [];
                chunkedAllPagesQuery = allPagesQuery.slice(0, 30);
                for (el of chunkedAllPagesQuery) {
                    resultQueue.push(wrapper.wrapperFirstRevision(el));
                }
                allPagesQuery = allPagesQuery.slice(31, allPagesQuery.length);
                queueFirstRevisions = queueFirstRevisions.concat(await Promise.all(resultQueue));
                conteggio += 1;
                //console.log(conteggio);
            }
        }
        else { //tutte assieme
            for (el of allPagesQuery) {
                queueFirstRevisions.push(wrapper.wrapperFirstRevision(el));
            }
            queueFirstRevisions = await Promise.all(queueFirstRevisions);
        }

        queueFirstRevisions = queueFirstRevisions.filter((el) => {
            return !el.hasOwnProperty('error');
        });

        //console.log(queueFirstRevisions);

        timespanArray2 = answers2.timespan.split(',');


        timespanArray = answers2.timespan.split(',');

        timespanArray[0] = timespanArray[0].substr(0, 4) + '-' + timespanArray[0].substr(4, 2) + '-' + timespanArray[0].substr(6, 2) + 'T00:00:00.000Z';

        timespanArray[1] = timespanArray[1].substr(0, 4) + '-' + timespanArray[1].substr(4, 2) + '-' + timespanArray[1].substr(6, 2) + 'T00:00:00.000Z';



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
        for (el of allPagesQuery) {
            queue.push(wrapper.wrapperGetParametricRevisions(getParams({ page: el, start: timespanArray[0], end: timespanArray[1] }), getParams2(el), getParams({ page: 'Talk:' + el, start: timespanArray[0], end: timespanArray[1] }), timespanArray2, filterCriteria));
            //queue.push(wrapper.wrapperGetParametricRevisions(getParams('Talk:' + el)));
        }

        let result = await Promise.all(queue);
        //console.log(result[0]);
        //console.log(result[0]);



        ////qui taggo disallineate/non disallineate

        //console.log(result);

        console.log('Time elapsed ' + (new Date().getTime() - start) / 1000 + 's', '|', result.length + ' Pages', '|', wrapper.lastCounterValue() + " revisions");
        //wrapper.resetCounterValue();

        if (answers6.fileName) { //se ho messo in fondo la stringa query del nome del file export, faccio il download del file di export

            let fileName;

            if (answers6.fileName.length == 0 || !answers6.fileName.replace(/\s/g, '').length) {
                fileName = new Date().getTime().toString();
            }
            else fileName = answers6.fileName;

            exportQueue = [];
            //per ogni elemento di result
            //per ogni elemento di result[0].revisions.history.revid
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
            let startExport = new Date().getTime();
            let resultExport = await Promise.all(exportQueue);
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


            /*
            if (allPagesQuery.length > 500) {//splitto
                let chunkedAllPagesQuery = [];
                while (allPagesQuery.length > 0) {
                    resultQueue = [];
                    chunkedAllPagesQuery = allPagesQuery.slice(0, 30);
                    for (el of chunkedAllPagesQuery) {
                        resultQueue.push(wrapper.wrapperFirstRevision(el));
                    }
                    allPagesQuery = allPagesQuery.slice(31, allPagesQuery.length);
                    queueFirstRevisions = queueFirstRevisions.concat(await Promise.all(resultQueue));
                    conteggio += 1;
                    //console.log(conteggio);
                }
            }
            else { //tutte assieme
                for (el of allPagesQuery) {
                    queueFirstRevisions.push(wrapper.wrapperFirstRevision(el));
                }
                queueFirstRevisions = await Promise.all(queueFirstRevisions);
            }*/

            let queueViews = [];
            let resultViews = [];
            let conta = 0;

            //console.log(Object.keys(finalExport.pages).length);
            if (Object.keys(finalExport.pages).length > 500) {
                //ottengo array con tutte le pagine
                let arrayOfPagesId = [];
                for (elId in finalExport.pages) {
                    arrayOfPagesId.push(elId);
                }
                //console.log('\narrayOfPagesId',arrayOfPagesId.length);
                while (arrayOfPagesId.length > 0) {
                    console.log('\narrayOfPagesId', arrayOfPagesId.length);

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
                            end: timespanArray2[1]
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
                        end: timespanArray2[1]
                    }));
                }
                resultViews = await Promise.all(queueViews);
                //console.log(resultViews);
            }

            //console.log(resultViews);

            for (el of resultViews) {
                finalExport.pages[el.pageid].views = el.dailyViews;
            }
            for (el in finalExport.pages) {
                //console.log(finalExport.pages[el].views);
            }
            ///////////////////////////////////////////////////////////////

            //console.log(finalExport);



            /////////RETRIEVE TALKS/////////////////////////

            queueTalks = [];
            for (elPageId in finalExport.pages) {
                //console.log(finalExport.pages[elPageId].title);
                queueTalks.push(wrapper.wrapperTalks(
                    {
                        action: 'query',
                        prop: 'revisions',
                        rvprop: ['ids', 'timestamp', 'size', 'flags', 'comment', 'user'].join('|'),
                        rvdir: 'newer', // order by timestamp asc
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
            ////console.log(resultTalks[0]);
            for (el of resultTalks) {
                finalExport.pages[el.pageid].talks = el;
            }
            /*for (el in finalExport.pages) {
                console.log(finalExport.pages[el].talks);
            }*/

            for (el of queueFirstRevisions) {
                finalExport.pages[el.pageid].creationTimestamp = el;
            }

            //console.log(finalExport.pages);

            //console.log(finalExport);
            fs.writeFile(fileName + '.json', JSON.stringify(finalExport), function (err) {

                if (err) throw err;
                console.log('\nThe export has been saved');
                console.log('Time elapsed for export: ' + (new Date().getTime() - startExport) / 1000 + 's');
                wrapper.resetCounterExport();
                wrapper.resetCounterValue();
            });
        }
    });
}
else if (modality === 'analyze') {

    ////console.log(queryArgs);
    let choosedFile = { selectFile: queryArgs[1] + '.json' };
    let choosedTimespan = { timespan: queryArgs[2] };
    let nameExportFile = { fileName: queryArgs[3] };

    jsonfile.readFile(choosedFile.selectFile, function (err, obj) {
        if (err) console.error(err);

        choosedTimespan = choosedTimespan.timespan.split(",");

        filterTimespan = [];

        filterTimespan[0] = choosedTimespan[0].substr(0, 4) + '-' + choosedTimespan[0].substr(4, 2) + '-' + choosedTimespan[0].substr(6, 2) + 'T00:00:00.000Z';

        filterTimespan[1] = choosedTimespan[1].substr(0, 4) + '-' + choosedTimespan[1].substr(4, 2) + '-' + choosedTimespan[1].substr(6, 2) + 'T00:00:00.000Z';

        millisecondStart = new Date(filterTimespan[0]).getTime();
        millisecondEnd = new Date(filterTimespan[1]).getTime();

        //console.log(millisecondStart, millisecondEnd);

        finalObject = {};

        //console.log(obj.pages['59506224'].views);
        for (el in obj.pages) {
            finalObject[el] = { pageid: obj.pages[el].pageid, title: obj.pages[el].title, edit: { history: [] }, views: [], talks: { history: [] } };

            //fetch delle edit//////////
            for (rev of obj.pages[el].revisions.history) {
                if (new Date(rev.timestamp) >= millisecondStart && new Date(rev.timestamp) <= millisecondEnd) {
                    finalObject[el].edit.history.push(rev);
                }
            }

            finalObject[el].edit.count = finalObject[el].edit.history.length;
            ////////////////////////////

            //fetch delle views/////////
            try {
                for (dailyView in obj.pages[el].views) {
                    //console.log(obj.pages[el].views[dailyView]);

                    obj.pages[el].views[dailyView].timestamp = obj.pages[el].views[dailyView].timestamp.substr(0, 4) + '-' + obj.pages[el].views[dailyView].timestamp.substr(4, 2) + '-' + obj.pages[el].views[dailyView].timestamp.substr(6, 2) + 'T00:00:00.000Z';

                    //console.log(obj.pages[el].views[dailyView].timestamp);

                    if (new Date(obj.pages[el].views[dailyView].timestamp) >= millisecondStart && new Date(obj.pages[el].views[dailyView].timestamp) <= millisecondEnd) {
                        finalObject[el].views.push(obj.pages[el].views[dailyView]);
                        //console.log(dailyView);

                    }
                }
            } catch (e) {
                console.log(e);
                return;
            }
            /////////////////////////////

            ///fetch dei talks///////////////////
            for (talk in obj.pages[el].talks.history) {

                if (new Date(obj.pages[el].talks.history[talk].timestamp) >= millisecondStart && new Date(obj.pages[el].talks.history[talk].timestamp) <= millisecondEnd) {
                    //console.log(obj.pages[el].talks.history[talk]);
                    finalObject[el].talks.history.push(obj.pages[el].talks.history[talk]);
                }

            }
            finalObject[el].talks.count = finalObject[el].talks.history.length;
            ///fetch dei talks///////////////////

            let max = { timestamp: -1 };
            //if (obj.pages[el].revisions.count > 0) max.timestamp = -1 /*obj.pages[el].revisions.history[0]*/;

            for (rev of obj.pages[el].revisions.history) {
                if (new Date(rev.timestamp) > new Date(max.timestamp) && new Date(rev.timestamp) <= millisecondEnd) {
                    max = rev;
                }
            }
            //console.log(max);
            if (max.timestamp == -1) max = {};
            finalObject[el].puntualStatistics = max;

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

        fs.writeFile(analizeFileName + '.json', JSON.stringify(finalObject), function (err) {

            if (err) throw err;
            console.log('The export has been saved with name: ' + analizeFileName);
        });
    });
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