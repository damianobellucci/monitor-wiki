var counter = 0;
var counterMaggioriCinquecento = 0;
var counterPages = 0;
const util = require('util');
const request = require('request');
var counterExport = 0;
const chalk = require('chalk');
var conteggioFirstRevision = 0;
monitorWiki = require('./monitor-wiki.js');

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
                    else resolve(title);

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

var wrapperFirstRevision = (title, server) => { //da splittare caso erro e caso body===undefined
    return new Promise((resolve, reject) => {

        let urlRequest = 'https://' + server + '/w/api.php?action=query&prop=revisions&rvlimit=1&rvprop=timestamp&rvdir=newer&pageids=' + title + '&format=json';
        request(urlRequest, { json: true }, (err, res, body) => {
            //console.log(title);
            if (err) { console.log(title, err); return; }

            //raramente succede che la richiesta venga soddisfatta ma il body sia undefined, filtro quindi questi casi e eslcudo le pagine corrispondenti
            else if (body === undefined || body.query === undefined) resolve({ error: '' });

            else {
                body.query.pages[Object.keys(body.query.pages)[0]].firstRevision = body.query.pages[Object.keys(body.query.pages)[0]].revisions[0].timestamp;
                delete body.query.pages[Object.keys(body.query.pages)[0]].revisions;
                conteggioFirstRevision += 1;
                //console.log(conteggioFirstRevision);
                resolve(body.query.pages[Object.keys(body.query.pages)[0]]);
            }
        });

    });
};

var wrapperGetParametricRevisions = (params) => {
    return new Promise((resolve, reject) => {

        client.getAllParametricData(params.query, function (err, data) {
            if (err) {
                console.log(err);
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
            let numberOfRevisions = data.revisions.length;

            var newData = {};
            newData.pageid = data.pageid;
            newData.title = data.title;
            newData.revisions = {};
            newData.revisions.history = data.revisions;
            newData.revisions.count = data.revisions.length;

            counter += numberOfRevisions;
            counterPages += 1;

            //taggo come disallineata
            newData.misalignment = {};
            let misalignmentNeditLog = [];
            let misalignmentFrequencyLog = [];

            if (params.parsedRequest.n) {
                if (newData.revisions.count >= params.parsedRequest.n) {
                    newData.misalignment.nEdit = true;
                }
                else newData.misalignment.nEdit = false;

                misalignmentNeditLog = newData.misalignment.nEdit;
                if (newData.misalignment.nEdit) misalignmentNeditLog = chalk.red(newData.misalignment.nEdit);
            }

            let frequencyEdit = [];
            if (params.parsedRequest.f) {

                frequencyTimespan = [];
                frequencyTimespan[0] = params.query.rvstart;
                frequencyTimespan[1] = params.query.rvend;
                var myDateStart = new Date(frequencyTimespan[0]);
                var myDateEnd = new Date(frequencyTimespan[1]);

                frequencyEdit = newData.revisions.count / ((myDateEnd.getTime() - myDateStart.getTime()) / (1000 * 60 * 60 * 24 * 365));

                if (frequencyEdit >= params.parsedRequest.f) {
                    newData.misalignment.frequencyEdit = true;
                }
                else newData.misalignment.frequencyEdit = false;

                misalignmentFrequencyLog = newData.misalignment.frequencyEdit;

                if (newData.misalignment.frequencyEdit) misalignmentFrequencyLog = chalk.red(newData.misalignment.frequencyEdit);
            }


            if (params.parsedRequest.n) { if (params.parsedRequest.hasOwnProperty('a') || (misalignmentNeditLog)) console.log('Page title: ' + chalk.green(newData.title) + ' | ' + 'misalignement n.Edit: ' + misalignmentNeditLog + ' (' + newData.revisions.count + ')'); }
            if (params.parsedRequest.f) { if (params.parsedRequest.hasOwnProperty('a') || (misalignmentFrequencyLog)) console.log('Page title: ' + chalk.green(newData.title) + ' | ' + 'misalignement frequency Edit: ' + misalignmentFrequencyLog, '(~ ' + Math.round(frequencyEdit) + ' edit/year)'); }

            resolve(newData);
        });
    })
};

var wrapperInfoGetParametricRevisions = (params, params2, params3, timespan, filterCriteria, filtraDisallieate, parsedRequest) => {
    return new Promise((resolve, reject) => {

        client.getAllParametricData(params, function (err, data) {
            if (err) {
                conteggiamoError += 1;
                return;
            }
            conteggiamoBuonFine += 1;

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
            let numberOfRevisions = data.revisions.length;

            var newData = {};

            newData.pageid = data.pageid;
            newData.title = data.title;
            newData.revisions = {};

            newData.revisions.history = data.revisions;
            newData.revisions.count = data.revisions.length;
            //console.log(newData.revisions);

            counter += numberOfRevisions;
            counterPages += 1;

            //taggo come disallineata
            let frequencyEdit;

            if (parsedRequest.f) {
                frequencyTimespan = [];

                frequencyTimespan[0] = params.rvstart;
                frequencyTimespan[1] = params.rvend;

                var myDateStart = new Date(frequencyTimespan[0]);
                var myDateEnd = new Date(frequencyTimespan[1]);

                frequencyEdit = newData.revisions.count / ((myDateEnd.getTime() - myDateStart.getTime()) / (1000 * 60 * 60 * 24 * 365));
            }

            //if (parsedRequest.n) console.log('Page title: ' + chalk.green(newData.title) /* + ' | ' + 'n.Edit:' + ' (' + newData.revisions.count + ')'*/);
            //if (parsedRequest.f) console.log('Page title: ' + chalk.green(newData.title) /* +' | ' + 'frequencyEdit: ' + '~ ' + Math.round(frequencyEdit) + ' edit/year'*/);
            console.log('Page title: ' + chalk.green(newData.title));

            //console.log(newData);*/
            resolve(newData);
        });
    })
};

var wrapperExport = (params, indexPreferences) => {
    return new Promise((resolve, reject) => {

        client.getAllParametricData(params, function (err, data) {
            //console.log(params);
            //parseObject = { title: data.title, pageid: data.pageid, revid: data.revid, nLinks: data.links.length, nExtLinks: data.externallinks.length, nSections: data.sections.length, displayTitle: data.displaytitle }
            if (err) {
                if (err === 'Error returned by API: You don\'t have permission to view deleted revision text.') {
                    counterExport++;
                    //console.log(err);
                    resolve([{
                        pageid: 'error'
                    }]);
                }
                else {
                    console.log(err);
                }
            }
            else {


                if (indexPreferences.nlinks && indexPreferences.listlinks) {

                    data[0].links = { count: data[0].links.length, list: data[0].links };
                    data[0].externallinks = { count: data[0].externallinks.length, list: data[0].externallinks }
                } else if (indexPreferences.nlinks) {

                    data[0].links = { count: data[0].links.length };
                    data[0].externallinks = { count: data[0].externallinks.length }
                } else if (indexPreferences.listlinks) {

                    data[0].links = { list: data[0].links };
                    data[0].externallinks = { list: data[0].externallinks }
                }

                data[0].sections = data[0].sections.length;

                //console.log(data);

                counterExport++;
                //console.log(counterExport);


                process.stdout.write("Downloading " + counterExport + "/" + monitorWiki.conteggioRevisioni() + ": " + Math.round(counterExport * 100 / monitorWiki.conteggioRevisioni()) + "%" + "\r");
                //console.log(data);
                resolve(data);
            }
        });
    })
};

var wrapperTalks = (params3, utilParams) => {
    return new Promise((resolve, reject) => {

        client.getAllParametricData(params3, function (err3, data3) {
            talk = {};
            if (err3) {
                console.log(err3);

                resolve({
                    history: 'error',
                    count: 'error',
                    pageid: utilParams
                });
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
                talk.pageid = utilParams;
                resolve(talk);
            }
        });
    });
};

var wrapperViews = (params) => {
    return new Promise((resolve, reject) => {
        //console.log(params.start, params.end);

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
            //console.log(body);
            if (err) console.log(params.pageTitle, err);
            if (err || body.title === 'Not found.') { /*return*/ /*console.log(params.pageTitle, err)*/;
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



            } resolve({ title: params.pageTitle, pageid: params.pageid, dailyViews: body.items });
        });
    });
};

var lastCounterValue = () => {
    return counter;
};
var resetCounterValue = () => {
    counter = 0;
};

var resetCounterExport = () => {
    counterExport = 0;
};

var getCounterPages = () => {
    return counterPages;
};

//module.exports.wrapperGetAllRevisions = wrapperGetAllRevisions;
module.exports.wrapperGetParametricRevisions = wrapperGetParametricRevisions;
module.exports.lastCounterValue = lastCounterValue;
module.exports.wrapperGetPagesByCategory = wrapperGetPagesByCategory;
module.exports.wrapperExport = wrapperExport;
module.exports.resetCounterValue = resetCounterValue;
module.exports.resetCounterExport = resetCounterExport;
module.exports.wrapperViews = wrapperViews;
module.exports.wrapperTalks = wrapperTalks;
module.exports.wrapperFirstRevision = wrapperFirstRevision;
module.exports.wrapperGetPageId = wrapperGetPageId;
module.exports.wrapperNameInference = wrapperNameInference;
module.exports.wrapperInfoGetParametricRevisions = wrapperInfoGetParametricRevisions;
module.exports.getCounterPages = getCounterPages;