const fs = require("fs");

function groupFile() {
    let file1 = fs.readFileSync("./injectFinal.txt", 'utf8');
    let file1Arr = file1.split("\n");

    let file2 = fs.readFileSync("./Australian.dic", 'utf8');
    let file2Arr = file2.split("\n");

    console.log(file1Arr.length, file2Arr.length);
    try {
        const injectTemp = [...file1Arr, ...file2Arr].filter(a => a.trim() != "");
        console.log(injectTemp.length);
        const inject = [...new Set(injectTemp)].sort();
        console.log(inject.length);
        fs.writeFileSync('./injectFinal2.txt', inject.join("\n"));
    } catch (err) {
        console.error("Error: ", err);
    }
}
groupFile();