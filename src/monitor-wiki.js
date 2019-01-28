var functions = require('./functions.js');
var wrappersModality = require('./wrappersModality.js');
var fs = require('fs');


//MAIN
(async () => {
    try {

        let modality = process.argv.slice(2, 3)[0].replace(' ', '');


        if (modality !== 'preview' && modality !== 'list' && modality !== 'info' && modality !== 'aggregateInfo') {
            console.log('\nError:', modality, 'is an invalid modality.');
            return;
        }


        let commandLineQuery = process.argv.slice(3);
        //caso in cui c'è un file di settaggio in input
        if (commandLineQuery.length == 1) {
            commandLineQuery = (await functions.readFile('../test/' + commandLineQuery[0])).toString();
        }

        let parsedRequest = functions.parseRequest(commandLineQuery);

        if (modality === 'preview') {

            await functions.sanityCheckPreview(parsedRequest);

            parsedRequest.t = parsedRequest.t[0];

            await Promise.resolve(wrappersModality.Preview(parsedRequest));
        }
        else if (modality === 'list') {

            await functions.sanityCheckList(parsedRequest);

            parsedRequest.t = parsedRequest.t[0];

            let resultPreview = await Promise.resolve(wrappersModality.Preview(parsedRequest));

            let finalObject = { pages: resultPreview, query: parsedRequest };

            fs.writeFile('../results/' + parsedRequest.e.replace(" ", ""), JSON.stringify(finalObject), function (err) {
                if (err) throw err;
                console.log('Page list has been saved with name: ' + parsedRequest.e, '\n');
            });
        }
        else if (modality === 'info') {

            start = new Date().getTime();
            await functions.sanityCheckInfo(parsedRequest);

            let finalExport = { query: parsedRequest, result: {} };
            let stringParsedRequest = JSON.stringify(parsedRequest);

            for (let i = 0; i < Object.keys(parsedRequest.t).length; i++) {
                let params = JSON.parse(stringParsedRequest);
                params.t = params.t[i];
                finalExport.result[i] = await Promise.resolve(wrappersModality.Info(params));
            }

            console.log('\nFine preparazione file');

            fs.writeFile('../results/' + parsedRequest.d, JSON.stringify(finalExport), function (err) {
                if (err) throw err;
                console.log('\nPages info has been saved with name: ' + parsedRequest.d);
                console.log('\nTime elapsed for all the process info:', (new Date().getTime() - start) / 1000 + 's', '\n');
            });
        }
        else if (modality === 'aggregateInfo') {
            start = new Date().getTime();

            await functions.sanityCheckInfo(parsedRequest);

            let finalExport = { query: parsedRequest, result: {} };
            let stringParsedRequest = JSON.stringify(parsedRequest);

            for (let i = 0; i < Object.keys(parsedRequest.t).length; i++) {
                let params = JSON.parse(stringParsedRequest);
                params.t = params.t[i];
                finalExport.result[i] = await Promise.resolve(wrappersModality.Info(params));
            }

            console.log('\nInizio preparazione file');

            let aggregatedExport = { query: parsedRequest, result: {} };

            Object.keys(finalExport.result).forEach((resultPage) => {
                aggregatedResultPage = { timespan: parsedRequest.t[resultPage], pages: {} };
                Object.keys(finalExport.result[resultPage].pages).forEach((page) => { //qui aggrego
                    let aggregatedPage = {
                        pageid: finalExport.result[resultPage].pages[page].pageid,
                        title: finalExport.result[resultPage].pages[page].title,
                        daysOfAge: finalExport.result[resultPage].pages[page].daysOfAge,
                        firstRevision: finalExport.result[resultPage].pages[page].firstRevision
                    };

                    if (finalExport.result[resultPage].pages[page].hasOwnProperty('notYetCreated')) {
                        aggregatedPage.notYetCreated = '';
                        delete (aggregatedPage.daysOfAge);
                        //console.log(aggregatedPage);
                    }

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
                                    /*else finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.links =
                                        finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.links.list.length;*/
                                    else finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.links =
                                        finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.links.count;

                                }
                                if (finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.hasOwnProperty('externallinks')) {
                                    if (finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.externallinks === 'deleted revision')
                                        finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.externallinks = 'n/a'
                                    /*else finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.externallinks =
                                        finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.externallinks.list.length;*/
                                    else finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.externallinks =
                                        finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.externallinks.count;
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

            console.log('\nFine preparazione file');

            fs.writeFile('../results/' + parsedRequest.d, JSON.stringify(aggregatedExport), function (err) {
                if (err) throw err;

                console.log('\nAggregated pages info has been saved with name: ' + parsedRequest.d);
                console.log('\nTime elapsed for all the process aggregateInfo:', (new Date().getTime() - start) / 1000 + 's', '\n');
            });
        }
    }
    catch (e) {
        console.log(e);
    }
})();
