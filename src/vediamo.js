


console.log('Inizio retrieve informazioni delle revisioni');
let startExport = new Date().getTime();


exportPagesObject = {};
finalExport = {};

finalExport.query = parsedRequest.q;

for (el in result) {
    exportPagesObject[result[el].pageid] = result[el];
}

finalExport.pages = exportPagesObject;

exportQueue = [];

if (indexPreferences.edit) {
    for (el in result) {
        for (rev of result[el].revisions.history) {
            //console.log(rev);

            exportQueue.push(wrapper.wrapperExport({
                action: "parse",
                format: "json",
                oldid: rev.revid,
                prop: ((indexPreferences.nlinks || indexPreferences.listlinks) ? "links|externallinks" : "") + "|sections|revid|displaytitle"
            }, indexPreferences)/*METTERE QUI el.pageid per bindare l'export della revisione con il pageid, magari metto anche le altre info utili che ci sono nello storico revisioni e che non sono nell'export, ad esempio il timestamp...  */);
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
}



if (indexPreferences.edit) {
    /////INIZIO GESTIONE REVID ELIMINATE///////
    vediamoStart = new Date().getTime();
    for (page in finalExport.pages) {
        if (finalExport.pages[page].revisions === undefined) { console.log(finalExport.pages[page]); return; }
        for (revision in finalExport.pages[page].revisions.history) {
            if (!finalExport.pages[page].revisions.history[revision].hasOwnProperty('export')) {
                finalExport.pages[page].revisions.history[revision].export = {
                    title: finalExport.pages[page].title,
                    pageid: finalExport.pages[page].pageid,
                    revid: finalExport.pages[page].revisions.history[revision].revid,
                    sections: 'deleted revision',
                    displaytitle: finalExport.pages[page].title
                }
                if (indexPreferences.nlinks || indexPreferences.listlinks) {
                    finalExport.pages[page].revisions.history[revision].export['links'] = 'deleted revision';
                    finalExport.pages[page].revisions.history[revision].export['externallinks'] = 'deleted revision';
                }
                //console.log(finalExport.pages[page].revisions.history[revision].export);
            }
        }
    }
    //console.log('tempo revid eliminate', ((new Date().getTime() - vediamoStart) / 1000));
    /////FINE GESTIONE REVID ELIMINATE///////
}
