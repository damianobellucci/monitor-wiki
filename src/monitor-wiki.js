var functions = require('./functions.js');
var wrappersModality = require('./wrappersModality.js');
var fs = require('fs');
var wrapper = require('./wrappers.js');


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
    }
    catch (e) {
        console.log(e);
    }
})();
