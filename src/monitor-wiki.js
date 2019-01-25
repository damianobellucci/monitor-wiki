var functions = require('./functions.js');
var wrappersModality = require('./wrappersModality.js');
var fs = require('fs');


//MAIN
(async () => {
    try {
        let parsedRequest = functions.parseRequest(process.argv);

        if (parsedRequest.m === 'preview') {
            parsedRequest.t = parsedRequest.t[0];
            console.log(parsedRequest);
            //if (parsedRequest.n && parsedRequest.f) { console.log('Error (input): only one of n.Edit or frequencyEdit is required.'); return; }
            await Promise.resolve(wrappersModality.Preview(parsedRequest));
        }
        else if (parsedRequest.m === 'list') {
            parsedRequest.t = parsedRequest.t[0];
            console.log(parsedRequest);
            //if (!parsedRequest.n && !parsedRequest.f) { console.log('Error (input): n.Edit or frequencyEdit is required.'); return; }
            //if (parsedRequest.n && parsedRequest.f) { console.log('Error (input): only one of n.Edit or frequencyEdit is required.'); return; }
            //if (!parsedRequest.e) { console.log('Error (input): -e flag is required for "info" modality.'); return; }

            let resultPreview = await Promise.resolve(wrappersModality.Preview(parsedRequest));

            //if (resultPreview.resultofPreview.length == 0) { console.log('No pages for the query.'); return; }

            let finalObject = { pages: resultPreview, query: parsedRequest };

            fs.writeFile(parsedRequest.e, JSON.stringify(finalObject), function (err) {
                if (err) throw err;
                console.log('Page list has been saved with name: ' + parsedRequest.e);
            });
        }
        else if (parsedRequest.m === 'info') {

            if (!parsedRequest.f) { console.log('Error (input): missing input file.'); return; }

            console.log(parsedRequest);

            //if (new Date(timespanArray[0]) > new Date(timespanArray[1])) { console.log('Error (timespan): ' + parsedRequest.t + ' is an invalid timespan.'); return };
            //if (isNaN(parsedRequest.n) || parsedRequest.n < 0) { console.log('Error (nEditCriteria): ' + parsedRequest.n + ' is not a valid nEditCriteria'); return; };
            //if (isNaN(parsedRequest.f) || parsedRequest.f < 0) { console.log('Error (frequencyEditCriteria): ' + parsedRequest.f + ' is not a valid frequencyEditCriteria'); return; };

            let finalExport = { query: parsedRequest, result: {} };
            let stringParsedRequest = JSON.stringify(parsedRequest);

            for (let i = 0; i < Object.keys(parsedRequest.t).length; i++) {
                let params = JSON.parse(stringParsedRequest);
                params.t = params.t[i];
                finalExport.result[i] = await Promise.resolve(wrappersModality.Info(params));
            }

            fs.writeFile(parsedRequest.d, JSON.stringify(finalExport), function (err) {
                if (err) throw err;
                console.log('Export completed');

                //console.log('Time elapsed for export: ' + resultInfo.timer / 1000 + 's');
            });
        }
        else if (parsedRequest.m === 'aggregateInfo') {

            if (!parsedRequest.f) { console.log('Error (input): missing input file.'); return; }

            console.log(parsedRequest);

            //if (new Date(timespanArray[0]) > new Date(timespanArray[1])) { console.log('Error (timespan): ' + parsedRequest.t + ' is an invalid timespan.'); return };
            //if (isNaN(parsedRequest.n) || parsedRequest.n < 0) { console.log('Error (nEditCriteria): ' + parsedRequest.n + ' is not a valid nEditCriteria'); return; };
            //if (isNaN(parsedRequest.f) || parsedRequest.f < 0) { console.log('Error (frequencyEditCriteria): ' + parsedRequest.f + ' is not a valid frequencyEditCriteria'); return; };

            let finalExport = { query: parsedRequest, result: {} };
            let stringParsedRequest = JSON.stringify(parsedRequest);



            for (let i = 0; i < Object.keys(parsedRequest.t).length; i++) {
                let params = JSON.parse(stringParsedRequest);
                params.t = params.t[i];
                finalExport.result[i] = await Promise.resolve(wrappersModality.Info(params));
            }

            let aggregatedExport = { query: parsedRequest, result: {} };


            Object.keys(finalExport.result).forEach((resultPage) => {
                aggregatedResultPage = { timespan: parsedRequest.t[resultPage], pages: {} };
                Object.keys(finalExport.result[resultPage].pages).forEach((page) => { //qui aggrego
                    let aggregatedPage = {
                        pageid: finalExport.result[resultPage].pages[page].pageid,
                        title: finalExport.result[resultPage].pages[page].title,
                        daysOfAge: finalExport.result[resultPage].pages[page].daysOfAge
                    };

                    //aggrego il numero di revisioni (utenti,minor edits)

                    if (finalExport.result[resultPage].pages[page].hasOwnProperty('revisions')) {
                        aggregatedPage.edits = finalExport.result[resultPage].pages[page].revisions.history.length;
                        aggregatedPage.minorEdits = finalExport.result[resultPage].pages[page].revisions.history.filter(el => { return el.hasOwnProperty('minor') }).length;
                        aggregatedPage.authors = Array.from(new Set(finalExport.result[resultPage].pages[page].revisions.history.map(el => el.user))).length;


                        Object.keys(finalExport.result[resultPage].pages[page].revisions.history).forEach((revisionId) => {
                            try {
                                if (finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.hasOwnProperty('links')) {
                                    if (finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.links === 'deleted revision')
                                        finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.links = 'n/a'
                                    else finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.links =
                                        finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.links.list.length;

                                }
                                if (finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.hasOwnProperty('externallinks')) {
                                    if (finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.externallinks === 'deleted revision')
                                        finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.externallinks = 'n/a'
                                    else finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.externallinks =
                                        finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.externallinks.list.length;
                                }
                                if (finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.hasOwnProperty('sections')) {
                                    if (finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.sections === 'deleted revision')
                                        finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.sections = 'n/a'
                                }

                            } catch (e) { console.log(finalExport.result[resultPage].pages[page].revisions.history[revisionId].export) }
                        });

                        aggregatedPage.revisions = {};
                        aggregatedPage.revisions.history = finalExport.result[resultPage].pages[page].revisions.history;
                        //aggrego risultati di export
                    }
                    //aggrego numero di commenti
                    finalExport.result[resultPage].pages[page].hasOwnProperty('talks') ?
                        aggregatedPage.comments = finalExport.result[resultPage].pages[page].talks.history.length : null;

                    //aggrego views

                    if (finalExport.result[resultPage].pages[page].hasOwnProperty('views')) {
                        finalExport.result[resultPage].pages[page].views === 'Not Available' ?
                            aggregatedPage.views = 'n/a' : aggregatedPage.views = finalExport.result[resultPage].pages[page].views.map(el => el.views).reduce((a, b) => a + b, 0);
                    }

                    aggregatedResultPage.pages[aggregatedPage.pageid] = aggregatedPage;

                });
                aggregatedExport.result[resultPage] = aggregatedResultPage;
            })

            fs.writeFile(parsedRequest.d, JSON.stringify(aggregatedExport), function (err) {
                if (err) throw err;
                console.log('Export completed');

                //console.log('Time elapsed for export: ' + resultInfo.timer / 1000 + 's');
            });
        }
    }
    catch (e) {
        console.log(e);
    }
})();
