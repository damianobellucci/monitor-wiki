const request = require('request');
const chalk = require('chalk');
monitorWiki = require('./monitor-wiki.js');
var counterExport = 0;

var wrapperNameInference = (params) => { //da splittare caso erro e caso body===undefined
    return new Promise((resolve, reject) => {

        let urlRequest = 'https://' + params.host + '/w/api.php?action=query&list=search&srsearch=' + params.string.replace('_', '%20') + '&srlimit=1&format=json';

        request(urlRequest, { json: true }, (err, res, body) => {
            if (err) { console.log(title, err); return; }
            else {
                //suggestion || neanche suggestione
                if (body.query.searchinfo.totalhits === 0) {

                    if (body.query.searchinfo.hasOwnProperty('suggestion')) {
                        //console.log(body.query);
                        resolve('suggestion:' + body.query.searchinfo.suggestion);
                    }
                    else resolve(params.string);

                }
                //console.log(body.query.search[0].title);
                //hit pieno
                else resolve(body.query.search[0].title);
            }
        });

    });
};

var wrapperGetPagesByCategory = (params) => {
    return new Promise((resolve, reject) => {
        client.getAllParametricData(params, async function (err, data) {
            if (err) {
                if (err === 'Error returned by API: The category name you entered is not valid.' || err.includes('Bad title')) {
                    //console.log('Error (input):', decodeURI(params.gcmtitle), 'is not a category.');
                    resolve(params.gcmtitle);
                }
                else if (!err === 'Error returned by API: The category name you entered is not valid.') {
                    console.log(err);
                    return;
                }
                else if (err === 'Error returned by API: Namespace doesn\'t allow actual pages.') {
                    console.log('Error (input)', 'get infos for the page \'' + decodeURI(params.gcmtitle) + '\' is not allowed.')
                    return;
                }
                else {
                    console.log(err);
                    return;
                }

            }
            else {

                if (data === undefined || data[0] === undefined) { console.log('Error (title): the category \'' + decodeURI(params.gcmtitle) + '\' doesn\'t exist or doesn\'t contain any page.'); return; }

                //console.log(util.inspect(data, false, null, true /* enable colors */));
                let allPages = [];

                for (let index = 0; index < data.length; index++) {
                    for (el in data[index].pages) {
                        //console.log({ title: data[index].pages[el].title, pageid: data[index].pages[el].pageid });
                        allPages.push(data[index].pages[el].pageid);
                    }
                    //data[0].pages[Object.keys(data[0].pages)].revisions = data[0].pages[Object.keys(data[0].pages)].revisions.concat(data[index].pages[Object.keys(data[index].pages)].revisions)
                }
                //console.log(allPages);
                //data = data[0].pages[Object.keys(data[0].pages)[0]];

                resolve(allPages);
            }
        });
    })
};
var counteraggio = 0;
var wrapperGetInfoCategory = (params) => {
    return new Promise((resolve, reject) => {
        client.getAllParametricData(params, async function (err, data) {
            if (err) {
                if (err === 'Error returned by API: The category name you entered is not valid.' || err.includes('Bad title')) {
                    //console.log('Error (input):', decodeURI(params.gcmtitle), 'is not a category.');
                    resolve(params.gcmtitle);
                }
                else if (!err === 'Error returned by API: The category name you entered is not valid.') {
                    console.log(err);
                    return;
                }
                else if (err === 'Error returned by API: Namespace doesn\'t allow actual pages.') {
                    console.log('Error (input)', 'get infos for the page \'' + decodeURI(params.gcmtitle) + '\' is not allowed.')
                    return;
                }
                else {
                    console.log(err);
                    return;
                }

            }
            else {
                if (data === undefined || data[0] === undefined) { resolve('n/a') }

                //console.log(util.inspect(data, false, null, true /* enable colors */));
                let allPages = [];

                for (let index = 0; index < data.length; index++) {
                    if (data[index] !== undefined) {
                        for (el in data[index].pages) {
                            allPages.push(data[index].pages[el]);
                            //console.log({ title: data[index].pages[el].title, pageid: data[index].pages[el].pageid });

                        }
                    }
                    //data[0].pages[Object.keys(data[0].pages)].revisions = data[0].pages[Object.keys(data[0].pages)].revisions.concat(data[index].pages[Object.keys(data[index].pages)].revisions)
                }
                //console.log(allPages);
                //data = data[0].pages[Object.keys(data[0].pages)[0]];
                //console.log('EHEH',allPages.map(x=>x.title));
                resolve(allPages);
            }
        });
    })
};

var wrapperGetPageId = (params) => {
    return new Promise((resolve, reject) => {
        client.getAllParametricData(params, function (err, data) {
            if (err) { console.log(err); return; }
            else {
                if (data[0].pages.hasOwnProperty('-1')) { console.log('Error (title): the page \'' + decodeURI(params.titles) + '\' doesn\'t exist.'); return; };
                resolve(data[0].pages[Object.keys(data[0].pages)[0]].pageid);
            }
        });
    });
};

var counterDataCreazione = 0;

/*var wrapperFirstRevision = (title, server) => { //da splittare caso erro e caso body===undefined
    return new Promise((resolve, reject) => {
        let urlRequest = 'https://' + server + '/w/api.php?action=query&prop=revisions&rvlimit=1&rvprop=timestamp&rvdir=newer&pageids=' + title + '&format=json';
        request(urlRequest, { json: true }, (err, res, body) => {
            counterDataCreazione += 1;
            process.stdout.write("Counter data creazione: " + counterDataCreazione + " " + title + '\r');

            //console.log(title);
            if (err || body === undefined || body.query === undefined || title === 4566347 && counterFailedFirstRevision < 10) {
                counterDataCreazione -= 1;

                counterFailedFirstRevision += 1;
                console.log('\nError (creation date call API): try to do the call another time for page', title + '.', 'Tot.', counterFailedFirstRevision, 'request failed.');
                resolve({ title: title, error: '' });
            }

            else {
                try {
                    body.query.pages[Object.keys(body.query.pages)[0]].firstRevision = body.query.pages[Object.keys(body.query.pages)[0]].revisions[0].timestamp;
                } catch (e) {
                    resolve({ error: '' });
                }
                delete body.query.pages[Object.keys(body.query.pages)[0]].revisions;
                //console.log(conteggioFirstRevision);
                resolve(body.query.pages[Object.keys(body.query.pages)[0]]);
            }
        });

    });
};*/

var counterFailedFirstRevision = 0;

var wrapperFirstRevision = (params) => {
    return new Promise((resolve, reject) => {
        client.getAllParametricData(params, function (err, data) {
            if (err) {
                console.log(err);
                counterFailedFirstRevision += 1;
                //console.log('\nID DELLA PAGINA INCRIMINATA', params.pageids);
                console.log('\nError (first revision call API): try to do the call another time.', 'Tot', counterFailedFirstRevision, 'request failed.');
                resolve({ pageid: params.pageids, error: '' })
            }
            else {
                counterDataCreazione += 1;
                try {
                    body = {};
                    body.query = data[0];
                    process.stdout.write("Counter data creazione: " + counterDataCreazione + " " + params.pageids + '\r');
                    body.query.pages[Object.keys(body.query.pages)[0]].firstRevision = body.query.pages[Object.keys(body.query.pages)[0]].revisions[0].timestamp;
                    delete body.query.pages[Object.keys(body.query.pages)[0]].revisions;
                    resolve(body.query.pages[Object.keys(body.query.pages)[0]]);

                } catch (e) {
                    counterDataCreazione -= 1;
                    counterFailedFirstRevision += 1;
                    console.log('\nID DELLA PAGINA INCRIMINATA', params.pageids);
                    console.log('\nError (first revision call API): try to do the call another time.', 'Tot', counterFailedFirstRevision, 'request failed.');
                    resolve({ pageid: params.pageids, error: '' })
                };

            }

        });
    });
};

var contaggio = 0;
var wrapperGetParametricRevisions = (params) => {
    return new Promise((resolve, reject) => {

        client.getAllParametricData(params.query, function (err, data) {
            //console.log(params);

            if (err) {
                contaggio += 1;
                console.log('Error (revisions): try to do the call another time for page', params.query.titles + '.', 'Tot.', contaggio, 'request failed.');
                resolve({ page: params.query.titles, error: '' });
                return;
            }

            if (data.length == 1) {
                data = data[0].pages[Object.keys(data[0].pages)[0]];
            }
            else {
                for (let index = 1; index < data.length; index++) {
                    data[0].pages[Object.keys(data[0].pages)].revisions = data[0].pages[Object.keys(data[0].pages)].revisions.concat(data[index].pages[Object.keys(data[index].pages)].revisions)
                }
                data = data[0].pages[Object.keys(data[0].pages)[0]];
            }

            if (!data.hasOwnProperty('revisions')) data.revisions = [];

            var newData = {};
            newData.pageid = data.pageid;
            newData.title = data.title;
            newData.revisions = {};
            newData.revisions.history = data.revisions;
            newData.revisions.count = data.revisions.length;

            resolve(newData);
        });
    })
};

var counterFailedExport = 0;

var wrapperExport = (params) => {
    return new Promise((resolve, reject) => {

        client.getAllParametricData(params.query, function (err, data) {
            //console.log(params);
            //parseObject = { title: data.title, pageid: data.pageid, revid: data.revid, nLinks: data.links.length, nExtLinks: data.externallinks.length, nSections: data.sections.length, displayTitle: data.displaytitle }
            if (err /*|| params.revision.revid === 819820642 && counterFailedExport < 10*/) {
                if (err === 'Error returned by API: You don\'t have permission to view deleted revision text.') {
                    counterExport++;
                    //console.log(err);
                    resolve([{
                        pageid: 'error'
                    }]);
                }
                else {
                    counterFailedExport += 1;

                    console.log('Error (export call API): try to do the call another time.', 'Tot', counterFailedExport, 'request failed.');

                    params.revision.error = '';
                    resolve(params.revision);
                }
            }
            else {


                if (params.indexPreferences.nlinks && params.indexPreferences.listlinks) {

                    data[0].links = { count: data[0].links.length, list: data[0].links };
                    data[0].externallinks = { count: data[0].externallinks.length, list: data[0].externallinks }
                } else if (params.indexPreferences.nlinks) {

                    data[0].links = { count: data[0].links.length };
                    data[0].externallinks = { count: data[0].externallinks.length }
                } else if (params.indexPreferences.listlinks) {

                    data[0].links = { list: data[0].links };
                    data[0].externallinks = { list: data[0].externallinks }
                }

                data[0].sections = data[0].sections.length;

                //console.log(data);

                counterExport++;
                //console.log(counterExport);


                //process.stdout.write("Downloading " + counterExport + "/" + params.counterRevisions + ": " + Math.round(counterExport * 100 / params.counterRevisions) + "%" + "\r");
                //console.log(data);
                resolve(data);
            }
        });
    })
};

var counterFailedTalks = 0;

var wrapperTalks = (params3, page) => {
    return new Promise((resolve, reject) => {
        client.getAllParametricData(params3, function (err3, data3) {
            talk = {};
            if (err3 /*|| page.title === 'Steve Bucknall' && counterFailedTalks < 10*/) {
                counterFailedTalks += 1;
                console.log('Error (talks call API): try to do the call another time for page', page.title + '.', 'Tot.', counterFailedTalks, 'request failed.');

                page.error = '';

                resolve(page);
            }
            if (data3 !== undefined) {
                if (data3.length == 1) {
                    data3 = data3[0].pages[Object.keys(data3[0].pages)[0]];
                }
                else {
                    for (let index = 1; index < data3.length; index++) {
                        data3[0].pages[Object.keys(data3[0].pages)].revisions = data3[0].pages[Object.keys(data3[0].pages)].revisions.concat(data3[index].pages[Object.keys(data3[index].pages)].revisions)
                    }
                    data3 = data3[0].pages[Object.keys(data3[0].pages)[0]];
                }
                if (!data3.hasOwnProperty('revisions')) data3.revisions = [];
                talk.history = data3.revisions;
                talk.count = data3.revisions.length;
                talk.pageid = page.pageid;
                resolve(talk);
            }
        });
    });
};

var counterFailedViews = 0;

var wrapperViews = (params) => {
    return new Promise((resolve, reject) => {
        //riscalo il timespan di un giorno
        params.start = params.start.substr(0, 4) + '-' + params.start.substr(4, 2) + '-' + params.start.substr(6, 2) + 'T00:00:00.000Z';
        params.start = new Date(params.start).getTime() + 1000 * 60 * 60 * 24;
        params.start = new Date(params.start);
        params.start = params.start.toISOString().substring(0, 10);
        //console.log(params.start);
        params.start = params.start.substr(0, 4) + params.start.substr(5, 2) + params.start.substr(8, 2);

        params.end = params.end.substr(0, 4) + '-' + params.end.substr(4, 2) + '-' + params.end.substr(6, 2) + 'T00:00:00.000Z';
        params.end = new Date(params.end).getTime() + 1000 * 60 * 60 * 24;
        params.end = new Date(params.end);
        params.end = params.end.toISOString().substring(0, 10);
        //console.log(params.end);
        params.end = params.end.substr(0, 4) + params.end.substr(5, 2) + params.end.substr(8, 2);


        //console.log(params.start, params.end);
        let urlRequest = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/' + params.server + '/all-access/all-agents/' + encodeURI(params.pageTitle) + '/daily/' + params.start + '/' + params.end;

        request(urlRequest, { json: true }, (err, res, body) => {
            if ((err /*|| params.pageid === 57468431 && counterFailedViews < 10*/)) {
                params.error = '';
                params.title = params.pageTitle;
                delete (params.pageTitle);
                counterFailedViews += 1;

                console.log('Error (views): try to do the call another time for page', params.title + '.', 'Tot.', counterFailedViews, 'request failed.');
                resolve(params);
            }
            if (body === undefined || body.title === 'Not found.') { /*return*/ /*console.log(params.pageTitle, err)*/; //caso views non disponibili per via del primo maggio 2015
                resolve({ title: params.pageTitle, pageid: params.pageid, dailyViews: 'Not Available' });
            }
            else {//formatto oggetto view
                for (el in body.items) {
                    delete (body.items[el].project);
                    delete (body.items[el].article);
                    delete (body.items[el].granularity);
                    delete (body.items[el].access);
                    delete (body.items[el].agent);

                    body.items[el].timestamp = body.items[el].timestamp.substr(0, 4) + '-' + body.items[el].timestamp.substr(4, 2) + '-' + body.items[el].timestamp.substr(6, 2) + 'T00:00:00.000Z';
                    body.items[el].timestamp = new Date(body.items[el].timestamp).getTime() - 1000 * 60 * 60 * 24;
                    body.items[el].timestamp = new Date(body.items[el].timestamp);
                    body.items[el].timestamp = body.items[el].timestamp.toISOString().substring(0, 10);
                    body.items[el].timestamp = body.items[el].timestamp.substr(0, 4) + body.items[el].timestamp.substr(5, 2) + body.items[el].timestamp.substr(8, 2);

                }
                //console.log(body);

                resolve({ title: params.pageTitle, pageid: params.pageid, dailyViews: body.items });
            }
        });
    });
};

var wrapperGetPagesInfo = (params) => { // category/noncategory 
    return new Promise((resolve, reject) => {
        client.getAllParametricData(params, function (err, data) {
            if (err) { console.log(err); return; }
            else {
                data = data[0];
                delete (data.normalized);
                for (let index in data.pages) {
                    delete (data.pages[index].contentmodel);
                    delete (data.pages[index].pagelanguage);
                    delete (data.pages[index].pagelanguagehtmlcode);
                    delete (data.pages[index].pagelanguagedir);
                    delete (data.pages[index].touched);
                    delete (data.pages[index].lastrevid);
                    delete (data.pages[index].length);
                    delete (data.pages[index].length);
                    delete (data.pages[index].missing);
                }
            }
            resolve(data.pages);
        });
    });
};

var wrapperGetTalksId = (params) => { // category/noncategory 
    return new Promise((resolve, reject) => {
        client.getAllParametricData(params, function (err, data) {
            if (err) { console.log(err); return; }
            else {
                data = data[0];
                delete (data.normalized);
                for (let index in data.pages) {
                    delete (data.pages[index].contentmodel);
                    delete (data.pages[index].pagelanguage);
                    delete (data.pages[index].pagelanguagehtmlcode);
                    delete (data.pages[index].pagelanguagedir);
                    delete (data.pages[index].touched);
                    delete (data.pages[index].lastrevid);
                    delete (data.pages[index].length);
                    delete (data.pages[index].length);
                    delete (data.pages[index].missing);
                }
            }

            console.log(data.pages); return;
        });
    });
};

function resetCounterExport() {
    counterExport = 0;
}

//module.exports.wrapperGetAllRevisions = wrapperGetAllRevisions;
module.exports.wrapperGetParametricRevisions = wrapperGetParametricRevisions;
module.exports.wrapperGetPagesByCategory = wrapperGetPagesByCategory;
module.exports.wrapperExport = wrapperExport;
module.exports.wrapperViews = wrapperViews;
module.exports.wrapperTalks = wrapperTalks;
module.exports.wrapperFirstRevision = wrapperFirstRevision;
module.exports.wrapperGetPageId = wrapperGetPageId;
module.exports.wrapperNameInference = wrapperNameInference;
module.exports.wrapperGetPagesInfo = wrapperGetPagesInfo;
module.exports.wrapperGetTalksId = wrapperGetTalksId;
module.exports.resetCounterExport = resetCounterExport;
module.exports.wrapperGetInfoCategory = wrapperGetInfoCategory;
module.exports.wrapperFirstRevision = wrapperFirstRevision;

