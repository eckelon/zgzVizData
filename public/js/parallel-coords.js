/* global d3 */

$(document).ready(function () {
    var monthNames = [
        'Enero',
        'Febrero',
        'Marzo',
        'Abril',
        'Mayo',
        'Junio',
        'Julio',
        'Agosto',
        'Septiembre',
        'Octubre',
        'Noviembre',
        'Diciembre'
    ];
    
    var contaminants = [
        'o3', 'so2', 'no2', 'co', 'pm10', 'sh2'
    ];
    
    var $container = $("#parallel-container");
    var $applyButton = $("#apply");
    var $startDate = $("#startDate");
    var $endDate = $("#endDate");
    
    function isContaminantEnabled(contaminant){
        return $("#check-"+contaminant).is(':checked');
    }
    
    $applyButton.click(createChart);
    
    var datepickerFormat = d3.time.format("%Y-%m-%d");
    
    var today = new Date();
    var todayMinus1Year = new Date(today - 86400 * 1000 * 365);
    
    $endDate.val(datepickerFormat(today));
    $startDate.val(datepickerFormat(todayMinus1Year));//About one year before...
    
    function createChart(){
        $container.html('<div class="loadingIndicator"><i class="uk-icon uk-icon-spinner uk-icon-spin"></i></div>');
        
        $.ajax({
            url: '/data',
            data: {
                start: $startDate.val(),
                end: $endDate.val()
            },
            type: 'GET',
            dataType: 'JSON',
            success: initParallelCoordinates
        });

        var dimensions = {
            station: 'Estación',
            year: 'Año',
            month: 'Mes',
            day: 'Día',
            o3: 'O\u2083',
            so2: 'SO\u2082',
            no2: 'NO\u2082',
            co: 'CO',
            pm10: 'PM\u2081\u2080',
            sh2: 'SH\u2082'
        };

        var dimensionNames = [];

        var dataTypes = {};

        //All numbers by default:
        var props = Object.getOwnPropertyNames(dimensions);
        for (var i in props) {
            var prop = props[i];
            
            if($.inArray(prop, contaminants) !== -1 && !isContaminantEnabled(prop)){
                continue;
            }
            
            var name = dimensions[prop];
            dataTypes[name] = 'number';
            dimensionNames.push(name);
        }

        dataTypes[dimensions.station] = 'string';

        var timeFormat = d3.time.format('%Y-%m-%dT%H:%M:%SZ');
        var yearPartFormat = d3.time.format('%Y');
        var monthPartFormat = d3.time.format('%m');
        var dayPartFormat = d3.time.format('%d');

        function contaminantToNumber(d) {
            if (d === null || typeof d === 'object') {
                return undefined;
            } else {
                return Number(d);
            }
        }

        function getMonthFromDate(date) {
            return Number(monthPartFormat(date));
            //return monthNames[Number(monthPartFormat(date)) - 1];
        }

        function initParallelCoordinates(data) {
            $container.find('.loadingIndicator').remove();
            
            var parallelsData = [
            ];

            for (var i = 0, max = data.rows.length; i < max; i++) {
                var row = data.rows[i];

                var date = timeFormat.parse(row.fecha_dt);

                var parallelRow = {};

                parallelRow[dimensions.station] = row.estacion;
                parallelRow[dimensions.year] = Number(yearPartFormat(date));
                parallelRow[dimensions.month] = getMonthFromDate(date);
                parallelRow[dimensions.day] = Number(dayPartFormat(date));
                
                function addContaminantData(contaminant){
                    if(isContaminantEnabled(contaminant)){
                        parallelRow[dimensions[contaminant]] = contaminantToNumber(row[contaminant+'_d']);
                    }
                }
                
                addContaminantData('o3');
                addContaminantData('so2');
                addContaminantData('no2');
                addContaminantData('co');
                addContaminantData('pm10');
                addContaminantData('sh2');
                

                parallelsData.push(parallelRow);
            }

            var colorScale = d3.scale.category10();

            var pc = d3.parcoords()("#parallel-container")
                    .data(parallelsData)
                    .types(dataTypes)
                    .dimensions(dimensionNames)
                    .margin({top: 24, left: 100, bottom: 12, right: 0})
                    .mode("queue")
                    .autoscale()
                    .alpha(0.2)
                    .color(function(d){
                        return colorScale(d[dimensions.station]);
                    })
                    .render()
                    .brushMode("1D-axes")  // enable brushing
                    .reorderable()
                    ;


            pc.on('brush', function(){
                console.log(pc.brushed().length);
            });
        }
    }
});