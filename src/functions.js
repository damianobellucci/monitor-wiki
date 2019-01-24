var wrapper = require('./wrappers.js');
var _ = require('underscore');

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
            if (arguments[el].slice(0, 1) === 't') {
                if (requestObject[arguments[el].slice(0, 1)] !== undefined) {
                    requestObject[arguments[el].slice(0, 1)][Object.keys(requestObject[arguments[el].slice(0, 1)]).length] =
                        arguments[el].slice(2).replace(' ', '');
                } else {
                    requestObject[arguments[el].slice(0, 1)] = {};
                    requestObject[arguments[el].slice(0, 1)][0] = arguments[el].slice(2).replace(' ', '');

                }
            }
            else requestObject[arguments[el].slice(0, 1)] = arguments[el].slice(2);
        }
    }
    //requestObject.t = requestObject.t.replace(' ', '');
    console.log(requestObject);
    return requestObject;
}

async function searchPages(parsedRequest) {
    return new Promise(async (resolve, reject) => {

        console.log('Inizio ricerca pagine');

        let queryArray = parsedRequest.q.split(",");
        let allPagesQuery = [];
        let inferencedQuery = [];

        for (el of queryArray) {

            let params = { string: encodeURI(el), host: parsedRequest.h };
            //console.log(result);
            inferencedQuery = inferencedQuery.concat(wrapper.wrapperNameInference(params));
        }

        inferencedQuery = await Promise.all(inferencedQuery);
        let suggestionQueue = [];

        for (let el of inferencedQuery) {
            console.log(el);

            if (el.includes('suggestion:')) suggestionQueue.push(el.replace('suggestion:', ''));
        }

        inferencedQuery = inferencedQuery.filter((el) => {
            return !el.includes('suggestion:');
        });

        let secondInferencedQuery = [];

        for (el of suggestionQueue) {
            let params = { string: encodeURI(el), host: parsedRequest.h };

            let result = await wrapper.wrapperNameInference(params);
            //console.log(result);
            secondInferencedQuery = secondInferencedQuery.concat(result.replace('suggestion:', ''));
        }

        inferencedQuery = inferencedQuery.concat(secondInferencedQuery);
        queryArray = inferencedQuery;

        //divido le pagine e le categorie. per sapere se una pagina è una categoria devo vedere se chiedendo la lista delle pagine mi da error. In quel caso è una pagina

        allPagesQuery = [];

        for (el of queryArray) {
            let categoryParams = {
                action: 'query',
                generator: 'categorymembers',
                gcmtitle: el,
                prop: 'info',
                cllimit: 'max',
                gcmlimit: 'max',
                format: 'json',
                gcmtype: 'page',/*|subcat*/
                gcmprop: 'ids|Ctitle|Csortkey|Ctype|Ctimestamp',
            };
            allPagesQuery.push(wrapper.wrapperGetPagesByCategory(categoryParams));
        }

        allPagesQuery = await Promise.all(allPagesQuery); //in questo risultato ci saranno anche le pagine che non sono risultate categorie

        let appArray = [];

        for (el of allPagesQuery) {
            appArray = appArray.concat(el);
        }

        allPagesQuery = appArray;

        //filtro le pagine provenienti da categorie dalle pagine che non sono categorie
        stringPages = allPagesQuery.filter((el) => {
            return typeof el === 'string'
        });
        allPagesQuery = allPagesQuery.filter((el) => { //ora allPagesQuery contiene solo pagine provenienti da categorie
            return typeof el !== 'string'
        });

        let stringToIdPages = [];

        for (el of stringPages) {
            let params = { action: 'query', titles: el };
            stringToIdPages = stringToIdPages.concat(wrapper.wrapperGetPageId(params));
        }

        stringToIdPages = await Promise.all(stringToIdPages);

        allPagesQuery = allPagesQuery.concat(stringToIdPages); //unisco le pagine provenienti dalle categorie alle pagine non categoria

        resolve(allPagesQuery);
    });
}



async function searchFirstRevision(parsedRequest, timespanArray, allPagesQuery) {
    return new Promise(async (resolve, reject) => {

        console.log('Inizio ricerca data creazione delle pagine');

        let queueFirstRevisions = [];

        //nella ricerca della data di creazione delle pagine, la libreria nodemw non riconosce alcuni parametri 
        //per la richiesta della prima revisione di una pagina, quindi devo gestire le richieste autonomamente

        if (allPagesQuery.length > 500) {//se le pagine sono molte, splitto l'array per evitare di fare troppe richieste alla voltaed incorrere nel timeout error

            let chunkedAllPagesQuery = [];
            while (allPagesQuery.length > 0) {
                resultQueue = [];
                chunkedAllPagesQuery = allPagesQuery.slice(0, 30);
                for (let el of chunkedAllPagesQuery) {
                    resultQueue.push(wrapper.wrapperFirstRevision(el, parsedRequest.h));
                }
                allPagesQuery = allPagesQuery.slice(31, allPagesQuery.length);
                queueFirstRevisions = queueFirstRevisions.concat(await Promise.all(resultQueue));
            }
        }
        else { //tutte assieme
            for (el of allPagesQuery) {
                queueFirstRevisions.push(wrapper.wrapperFirstRevision(el, parsedRequest.h));
            }
            queueFirstRevisions = await Promise.all(queueFirstRevisions);
        }
        console.log('Fine retrieve data creazione delle pagine');

        //raramente succede che la richiesta venga soddisfatta ma il body sia undefined, filtro quindi questi casi e eslcudo le pagine corrispondenti
        queueFirstRevisions = queueFirstRevisions.filter((el) => {
            return !el.hasOwnProperty('error');
        });


        //se la pagina è stata creata dopo del timespan end della pagina, allora non la metto tra le pagine da processare   
        queueFirstRevisions = queueFirstRevisions.filter((el) => {
            return new Date(el.firstRevision).getTime() <= new Date(timespanArray[1]).getTime();
        });

        resolve(queueFirstRevisions);
    });
}

async function searchRevisions(parsedRequest, timespanArray, allPagesQuery) {
    return new Promise(async (resolve, reject) => {
        let queue = [];

        console.log('Inizio ricerca revisioni delle pagine');

        for (el of allPagesQuery) {
            let params = {
                query: {
                    action: 'query',
                    prop: 'revisions',
                    rvprop: ['ids', 'timestamp', 'size', 'flags', 'comment', 'user'].join('|'),
                    rvdir: 'newer', // order by timestamp asc
                    rvlimit: 'max',
                    titles: el,
                    rvstart: timespanArray[0],
                    rvend: timespanArray[1]
                },
                parsedRequest: parsedRequest
            }
            queue.push(wrapper.wrapperGetParametricRevisions(params));
        }

        let result = await Promise.all(queue);
        console.log('Fine retrieve revisioni delle pagine');
        resolve(result);
    });
}

async function getPageExport(result, indexPreferences, counterRevisions) {
    return new Promise(async (resolve, reject) => {
        let exportQueue = [];

        //input:result
        for (el in result) {
            for (rev of result[el].revisions.history) {
                let params = {
                    query: {
                        action: "parse",
                        format: "json",
                        oldid: rev.revid,
                        prop: ((indexPreferences.nlinks || indexPreferences.listlinks) ? "links|externallinks" : "") + "|sections|revid|displaytitle"
                    },
                    indexPreferences: indexPreferences,
                    counterRevisions: counterRevisions
                }
                exportQueue.push(wrapper.wrapperExport(params));
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
        resolve(result);
    });

}

function getIndexFlagPreferences(parsedRequest) {
    let indexPreferences = {};

    if (parsedRequest.hasOwnProperty('i')) {
        if (parsedRequest.i.includes('all')) {
            indexPreferences = { edit: true, views: true, talks: true, nlinks: true, listlinks: true };
        }
        else {
            if (parsedRequest.i.includes('edit')) indexPreferences.edit = true;
            if (parsedRequest.i.includes('views')) indexPreferences.views = true;
            if (parsedRequest.i.includes('comments')) indexPreferences.talks = true;
            if (parsedRequest.i.includes('nlinks')) indexPreferences.nlinks = true;
            if (parsedRequest.i.includes('listlinks')) indexPreferences.listlinks = true;

        }
    }
    return indexPreferences;
}

/*async function getPageViews(finalExport, timespanArray2, resultPreview) {
    return new Promise(async (resolve, reject) => {
        let queueViews = [];
        let resultViews = [];

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
        }
        console.log('Fine retrieve views relative alle pagine');
        resolve(resultViews);
    });
}*/

async function getPageViews(pagesInfo, timespanArray, parsedRequest) {
    return new Promise(async (resolve, reject) => {
        let queueViews = [];
        let resultViews = [];

        console.log('Inizio retrieve views relative alle pagine');

        if (pagesInfo.length > 500) {

            while (pagesInfo.length > 0) {
                queueViews = [];
                chunkedArrayOfPages = pagesInfo.slice(0, 25);
                for (let page of chunkedArrayOfPages) {
                    let params = {
                        pageTitle: page.title,
                        pageid: page.pageid,
                        start: timespanArray[0],
                        end: timespanArray[1],
                        server: parsedRequest.h
                    };
                    queueViews.push(wrapper.wrapperViews(params));
                }
                pagesInfo = pagesInfo.slice(25, pagesInfo.length);
                resultViews = resultViews.concat(await Promise.all(queueViews));

            }

        } else {
            for (page of pagesInfo) {
                queueViews.push(wrapper.wrapperViews({
                    pageTitle: page.title,
                    pageid: page.pageid,
                    start: timespanArray[0],
                    end: timespanArray[1],
                    server: parsedRequest.h
                }));
            }
            resultViews = await Promise.all(queueViews);
        }
        console.log('Fine retrieve views relative alle pagine');
        resolve(resultViews);
    });
}

/*async function getPageTalks(finalExport, timespanArray) {
    return new Promise(async (resolve, reject) => {
        queueTalks = [];
        console.log('Inizio retrieve talks delle pagine');
        for (elPageId in finalExport.pages) {
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

        resolve(resultTalks);
    });
}*/

async function getPageTalks(pages, timespanArray) {
    return new Promise(async (resolve, reject) => {
        queueTalks = [];
        console.log('Inizio retrieve talks delle pagine');
        for (page of pages) {
            queueTalks.push(wrapper.wrapperTalks(
                {
                    action: 'query',
                    prop: 'revisions',
                    rvprop: ['ids', 'timestamp', 'size', 'flags', 'comment', 'user'].join('|'),
                    rvdir: 'newer', // order by timestamp ascz
                    rvlimit: 'max',
                    titles: 'Talk:' + page.title,
                    rvstart: timespanArray[0],
                    rvend: timespanArray[1]
                }
                ,
                page.pageid
            ));
        }
        let resultTalks = await Promise.all(queueTalks);
        console.log('Fine retrieve talks delle pagine');

        resolve(resultTalks);
    });
}


module.exports.parseRequest = parseRequest;
module.exports.searchPages = searchPages;
module.exports.searchFirstRevision = searchFirstRevision;
module.exports.searchRevisions = searchRevisions;
module.exports.getIndexFlagPreferences = getIndexFlagPreferences;
module.exports.getPageExport = getPageExport;
module.exports.getPageViews = getPageViews;
module.exports.getPageTalks = getPageTalks;

