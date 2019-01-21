var functions = require('./functions.js');
var wrappersModality = require('./wrappersModality.js');
var fs = require('fs');


//MAIN
(async () => {
    try {
        let parsedRequest = functions.parseRequest(process.argv);

        if (parsedRequest.m === 'preview') {
            if (parsedRequest.n && parsedRequest.f) { console.log('Error (input): only one of n.Edit or frequencyEdit is required.'); return; }
            let resultPreview = await Promise.resolve(wrappersModality.Preview(parsedRequest));
            console.log('Time elapsed ' + (resultPreview.timer) / 1000 + 's', '|', resultPreview.numberOfPages.misaligned, 'misaligned pages', '/', resultPreview.numberOfPages.all, 'total pages', '|', resultPreview.revCounter + " revisions");
        }
        else if (parsedRequest.m === 'list') {
            if (!parsedRequest.n && !parsedRequest.f) { console.log('Error (input): n.Edit or frequencyEdit is required.'); return; }
            if (parsedRequest.n && parsedRequest.f) { console.log('Error (input): only one of n.Edit or frequencyEdit is required.'); return; }
            if (!parsedRequest.e) { console.log('Error (input): -e flag is required for "info" modality.'); return; }

            let resultPreview = await Promise.resolve(wrappersModality.Preview(parsedRequest));
            console.log('Time elapsed ' + (resultPreview.timer) / 1000 + 's', '|', resultPreview.numberOfPages.misaligned, 'misaligned pages', '/', resultPreview.numberOfPages.all, 'total pages', '|', resultPreview.revCounter + " revisions");

            if (resultPreview.resultofPreview.length == 0) { console.log('No pages for the query.'); return; }

            let finalObject = { pages: [], query: parsedRequest };

            let listResult = [];

            for (el of resultPreview.resultofPreview) {
                listResult.push({ pageid: el.pageid, title: el.title, misalignment: el.misalignment });
            }

            finalObject.pages = listResult;
            //console.log(finalObject);

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
            
            let resultInfo = await Promise.resolve(wrappersModality.Info(parsedRequest));

            console.log('Time elapsed for export: ' + resultInfo.timer / 1000 + 's');
        }
    }
    catch (e) {
        console.log(e);
    }
})();
