var express = require('express');
var router = express.Router();
var utils = require("../utils");

var IESCITIES_DATASET_ID = 288;
        
var IDS_PLACEHOLDER = '{IDS_PLACEHOLDER}';
var SQL_COORDINATES = 'select max(id) as id, coordenadas_p as coordenadas from docs group by coordenadas_p';
var SQL_NAMES = "select parent_id as id, estacion from docs_estacion_smultiple where parent_id in ('" +  IDS_PLACEHOLDER + "')";

/* GET users listing. */
router.get('/', function (req, res, next) {
    function generateResponse(data){
        res.json(data);
    }

    var options = {
        host: 'iescities.com',
        path: '/IESCities/api/data/query/' + IESCITIES_DATASET_ID + '/sql?origin=original',
        method: 'POST',
        body: SQL_COORDINATES
    };
    utils.getJSON(options, function (status, coords) {
        if(!coords.rows || !coords.rows.length){
            generateResponse([]);
            return;
        }
        
        var ids = coords.rows.map(function(d){
            return d.id;
        });
        
        var namesSQL = SQL_NAMES.replace(IDS_PLACEHOLDER, ids.join("', '"));
        options.body = namesSQL;
        utils.getJSON(options, function (status, namesAndIds) {
            if(!namesAndIds.rows || !namesAndIds.rows.length){
                generateResponse([]);
                return;
            }
            
            var finalData = [];
            var namesIndexById = {};
            for (var i = 0, max = namesAndIds.rows.length; i < max; i++) {
                var row = namesAndIds.rows[i];
                namesIndexById[row.id] = row.estacion;
            }
            
            for (var j = 0, max = coords.rows.length; j < max; j++) {
                var coord = coords.rows[j];
                
                var coordParts = coord.coordenadas.split(',');
                
                finalData.push({
                    name: namesIndexById[coord.id],
                    coord1: coordParts[0],
                    coord2: coordParts[1]
                });
            }
            
            generateResponse(finalData);
        });
    });
});

module.exports = router;
