var express = require('express');
var router = express.Router();

var utils = require("../utils");

var SQL = 'select s.estacion, d.fecha_dt, d.last_modified, d.o3_d, d.no2_d, d.pm10_d, d.so2_d, d.sh2_d, d.co_d from'
+ ' docs as d,'
+ ' docs_estacion_smultiple as s'
+ ' where d.id = s.parent_id'
//+ " and fecha_dt >= '2014-01-01' and fecha_dt < '2015-01-01'"
+ ' order by fecha_dt'
;

var IESCITIES_DATASET_ID = 288;

var dataCache = null;

/* GET users listing. */
router.get('/', function (req, res, next) {
    function generateResponse(data){
        res.json(data); 
    }
    
    if(!dataCache){
        var options = {
            host: 'iescities.com',
            path: '/IESCities/api/data/query/' + IESCITIES_DATASET_ID + '/sql?origin=original',
            method: 'POST',
            body: SQL
        };
        utils.getJSON(options, function(status, data){
            dataCache = data;
            generateResponse(data);
        });
    }else{
        console.log('ok');
        generateResponse(dataCache);
    }
});

module.exports = router;
