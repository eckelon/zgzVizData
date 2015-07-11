var express = require('express');
var router = express.Router();
var moment = require('moment');

var utils = require("../utils");

var DATE_COND_PLACEHOLDER = '{DATE_COND_PLACEHOLDER}';
var SQL = 'select s.estacion, d.fecha_dt, d.last_modified, d.o3_d, d.no2_d, d.pm10_d, d.so2_d, d.sh2_d, d.co_d from'
        + ' docs as d,'
        + ' docs_estacion_smultiple as s'
        + ' where d.id = s.parent_id'
        + ' ' + DATE_COND_PLACEHOLDER
//+ " and fecha_dt >= '2014-01-01' and fecha_dt < '2015-01-01'"
        + ' order by fecha_dt'
        ;
        
var DEFAULT_START_DATE = '2014-01-01';

var IESCITIES_DATASET_ID = 288;

var NodeCache = require("node-cache");
var cache = new NodeCache({stdTTL: 60 * 10, checkperiod: 60});

/* GET users listing. */
router.get('/', function (req, res, next) {
    function generateResponse(data){
        res.json(data);
    }
    
    var startDate = req.param('start');
    var endDate = req.param('end');
    
    if(!moment(startDate, "YYYY-MM-DD").isValid()){
        startDate = DEFAULT_START_DATE;
    }
    if(!moment(endDate, "YYYY-MM-DD").isValid()){
        endDate = null;
    }
    
    var finalSQL = SQL;
    
    if(startDate && endDate){
        finalSQL = finalSQL.replace(DATE_COND_PLACEHOLDER, "and fecha_dt between '" + startDate +"' AND '" + endDate + "'");
    }else{
        finalSQL = finalSQL.replace(DATE_COND_PLACEHOLDER, "and fecha_dt >= '" + startDate);
    }
    
    var cacheKey = finalSQL;
    
    console.log(finalSQL);
    
    cache.get(cacheKey, function (err, value) {
        if (value) {
            generateResponse(value);
        } else {
            var options = {
                host: 'iescities.com',
                path: '/IESCities/api/data/query/' + IESCITIES_DATASET_ID + '/sql?origin=original',
                method: 'POST',
                body: finalSQL
            };
            utils.getJSON(options, function (status, data) {
                if(data.rows && data.rows.length){
                    cache.set(cacheKey, data);
                }
                
                generateResponse(data);
            });
        }
    });

});

module.exports = router;
