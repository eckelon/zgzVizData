var express = require('express');
var router = express.Router();
var utils = require("../utils");

var IESCITIES_DATASET_ID = 288;
        
var IDS_PLACEHOLDER = '{IDS_PLACEHOLDER}';
var SQL_COORDINATES = 'select max(id), coordenadas_p from docs group by coordenadas_p';
var SQL_NAMES = 'select id, estacion from docs_estacion_smultiple where id in (' +  IDS_PLACEHOLDER + ')';

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
        console.log(coords);
        var ids = coords.rows.map(function(d){
            return d.id;
        });
        
        options.body = SQL_NAMES.replace(IDS_PLACEHOLDER, ids.join("', '"));
        utils.getJSON(options, function (status, namesAndIds) {
            var finalData = [];
            var namesIndexById = {};
            for (var i = 0, max = namesAndIds.rows; i < max; i++) {
                var row = namesAndIds.rows[i];
                namesIndexById[row.id] = row.name;
            }
            
            for (var j = 0, max = coords.length; j < max; j++) {
                var coord = coords[j];
                
                var coordParts = coord.coordenadas_p.split(',');
                finalData.push({
                    name: namesIndexById[coord.id],
                    coord1: coordParts[0],
                    coord2: coordParts[1]
                });
            }
        });
    });
});

module.exports = router;
