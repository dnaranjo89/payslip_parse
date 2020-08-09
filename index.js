const pdfreader = require("pdfreader");
const path = require('path');
const fs = require('fs');
const { parse } = require('json2csv');

const fixMonth = date => {
  return date
  .replace('ENE', 'JAN')
  .replace('ABR', 'APR')
  .replace('DIC', 'DEC')
}

const listFiles = () =>{
  return new Promise((resolve, reject) =>{

    //joining path of directory
    const directoryPath = path.join(__dirname, 'payslips');
    //passsing directoryPath and callback function
    fs.readdir(directoryPath, function (err, files) {
      //handling error
      if (err) {
        reject('Unable to scan directory: ' + err);
      }
      resolve(files)
    });
  })
}

const getFollowing = (fileName, text) => {
  let now = false;
  return new Promise((resolve, reject) => {
    new pdfreader.PdfReader().parseFileItems(
      `payslips/${fileName}`,
      function (err, item) {
        if (err) console.error(err);
        else if (!item){
          reject(`'${text}' not found in ${fileName}`)
        }
        else if (item && item.text) {
          //  console.log(item.text);
          if (now) {
            resolve(item.text.trim());
          }
          if (item.text.includes(text)) {
            now = true;
          }
        }
      }
    );
  });
};

const getPeriod = async (fileName) => {
  const result = await getFollowing(fileName,"MENS");
  const [start, end] = result.split("a");
  return { start: fixMonth(start.trim()), end: fixMonth(end.trim().slice(0,9))};
};

const processFile = async fileName => {
  const {start, end} = await getPeriod(fileName);
  const total = await getFollowing(fileName, "LIQUIDO A PERCIBIR");
  // console.log("start", start);
  // console.log("end", end);
  // console.log('total', total);
  return {
    fileName,
    start,
    end,
    total,
  }
}

const saveInCSV = result => {

  const fields = ['fileName', 'start', 'end', 'total'];
  const opts = { fields };

  try {
    const csv = parse(result, opts);
    fs.writeFileSync('result.csv', csv);
    return csv
  } catch (err) {
    console.error(err);
  }
}




const run = async () => {
  try {
    const files = await listFiles();
    const results = await Promise.all(files.map(fileName => processFile(fileName)));
    const csv = saveInCSV(results)
    console.log('----', csv)
  }catch(e){
    console.log(e)
  }
};

run();
