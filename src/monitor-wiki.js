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

            console.log('\nInizio preparazione file (ManageAggregateInfo)');

            let aggregatedExport = functions.ManageAggregateInfo(parsedRequest, finalExport);

            console.log('\nFine preparazione file (ManageAggregateInfo)');


            /*
            function AggregateIndexExport(aggregatedExport) {
                let results = aggregatedExport.result;

                for (let result in results) {
                    let articles = results[result].pages;
                    let arrayTimespan = functions.ConvertYYYYMMDDtoISO(results[result].timespan);
                    let timespan = (new Date(arrayTimespan[1]).getTime() - new Date(arrayTimespan[0]).getTime()) / 1000 / 60 / 60 / 24;
                    console.log(timespan);

                    for (let idArticle in articles) {

                        let totLinks = 0; let totExternalLinks = 0; let totSections = 0;

                        let historyRevisions = articles[idArticle].revisions.history;
                        for (let revisionIndex in historyRevisions) {

                            let infoExport = historyRevisions[revisionIndex].export;

                            if (infoExport.links != 'n/a' && infoExport.externallinks != 'n/a' && infoExport.links != 'n/a') {
                                totLinks += infoExport.links;
                                totExternalLinks += infoExport.externallinks;
                                totSections += infoExport.sections;
                            }

                        }
                        results[result].pages[idArticle].linkMean = totLinks / timespan;
                        results[result].pages[idArticle].externallinksMean = totExternalLinks / timespan;
                        results[result].pages[idArticle].sectionsMean = totSections / timespan;
                        //console.log(results[result].pages[idArticle]);
                    }
                }

            }
            AggregateIndexExport(aggregatedExport);
            */

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
