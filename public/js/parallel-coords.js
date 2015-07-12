/* global d3, dataTables */
function ContaminantsChart(inputOptions){
    
    var defaultOptions = {
        url: '/data'
    };
    
    var options = $.extend({}, defaultOptions, inputOptions);
    
    var self = this;
    
    //Constants:
    var TIMEOUT_MILLIS = 250;
    
    var ALL_CONTAMINANTS = [
        'o3', 'so2', 'no2', 'co', 'pm10', 'sh2'
    ];

    //jQuery cached objects
    var $parallelContainer = $("#parallel-container");
    var $tableContainer = $("#table-container");
    var $applyButton = $("#apply");
    var $startDate = $("#startDate");
    var $endDate = $("#endDate");
    var $opacity = $("#opacity");

    var datepickerFormat = d3.time.format("%d/%m/%Y");

    //Initialize some values:
    var today = new Date();
    var todayMinus1Year = new Date(today - 86400 * 1000 * 365);

    $endDate.val(datepickerFormat(today));
    $startDate.val(datepickerFormat(todayMinus1Year));//About one year before...
    
    //Private variables and functions:
    var parCoordsChart = null;
    var lastLoadedData = null;

    function isContaminantEnabled(contaminant) {
        return $("#check-" + contaminant).is(':checked');
    }
    
    var dimensions = {
        station: 'Estación',
        year: 'Año',
        month: 'Mes',
        day: 'Día',
        fulldate: 'fulldate',
        o3: 'O\u2083',
        so2: 'SO\u2082',
        no2: 'NO\u2082',
        co: 'CO',
        pm10: 'PM\u2081\u2080',
        sh2: 'SH\u2082'
    };

    var fullTimeStringFormat = d3.time.format('%Y-%m-%dT%H:%M:%SZ');
    var datePartFormat = d3.time.format('%Y-%m-%d');
    var yearPartFormat = d3.time.format('%Y');
    var monthPartFormat = d3.time.format('%m');
    var dayPartFormat = d3.time.format('%d');

    function contaminantToNumber(d) {
        if (d === null || d === undefined || typeof d === 'object') {
            return null;
        } else {
            var num = Number(d);

            if(isNaN(num)){
                return null;
            }
            return Number(d);
        }
    }

    function getMonthFromDate(date) {
        return Number(monthPartFormat(date));
        //return monthNames[Number(monthPartFormat(date)) - 1];
    }
    
    var executeOnceTimes = {
        lastBrushTime: null,
        lastResize: null
    };
    function executeOnce(time, timeIndex, callback){
        if(time !== executeOnceTimes[timeIndex]){
            return;//Wait until the user stops sending multi events
        }

        callback();
    }

    function initParallelCoordinates(data) {
        $parallelContainer.find('canvas, svg').remove();//Remove any possible old data
        $parallelContainer.find('.loadingIndicator').hide();

        var dimensionNames = [];

        var dataTypes = {};
        
        var opacity = $opacity.val();

        //All numbers by default:
        var props = Object.getOwnPropertyNames(dimensions);
        for (var i in props) {
            var prop = props[i];

            if ($.inArray(prop, ALL_CONTAMINANTS) !== -1 && !isContaminantEnabled(prop)) {
                continue;
            }

            var name = dimensions[prop];
            dataTypes[name] = 'number';
            dimensionNames.push(name);
        }

        dataTypes[dimensions.station] = 'string';

        var parallelsData = [
        ];
        
        var enabledContaminantsIndex = {
            o3: isContaminantEnabled('o3'),
            so2: isContaminantEnabled('so2'),
            no2: isContaminantEnabled('no2'),
            co: isContaminantEnabled('co'),
            pm10: isContaminantEnabled('pm10'),
            sh2: isContaminantEnabled('sh2')
        };

        for (var i = 0, max = data.rows.length; i < max; i++) {
            var row = data.rows[i];

            var date = fullTimeStringFormat.parse(row.fecha_dt);

            var parallelRow = {};

            parallelRow[dimensions.station] = row.estacion;
            parallelRow[dimensions.year] = Number(yearPartFormat(date));
            parallelRow[dimensions.month] = getMonthFromDate(date);
            parallelRow[dimensions.day] = Number(dayPartFormat(date));
            parallelRow[dimensions.fulldate] = row.fecha_dt;

            function addContaminantData(contaminant) {
                if (enabledContaminantsIndex[contaminant]) {
                    parallelRow[dimensions[contaminant]] = contaminantToNumber(row[contaminant + '_d']);
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

        parCoordsChart = d3.parcoords()("#parallel-container")
                .data(parallelsData)
                .types(dataTypes)
                .dimensions(dimensionNames)
                .hideAxis([dimensions.fulldate])
                .margin({top: 24, left: 100, bottom: 12, right: 0})
                .mode("queue")
                .autoscale()
                .alpha(opacity)
                .color(function (d) {
                    return colorScale(d[dimensions.station]);
                })
                .render()
                .brushMode("1D-axes")  // enable brushing
                .reorderable()
                ;

        function applyBrushedData(){
            var brushedData = parCoordsChart.brushed();
            if(brushedData !== false){
                var dataForTable = {
                    rows: []
                };

                //Adaptar los datos del parallels al formato del API
                for (var i = 0, max = brushedData.length; i < max; i++) {
                    var brushedRow = brushedData[i];

                    dataForTable.rows.push({
                        estacion: brushedRow[dimensions.station],
                        fecha_dt: brushedRow[dimensions.fulldate],
                        o3_d: brushedRow[dimensions.o3],
                        so2_d: brushedRow[dimensions.so2],
                        no2_d: brushedRow[dimensions.no2],
                        co_d: brushedRow[dimensions.co],
                        pm10_d: brushedRow[dimensions.pm10],
                        sh2_d: brushedRow[dimensions.sh2]
                    });
                }

                initTable(dataForTable);
            } else {
                initTable(lastLoadedData);
            }
        }

        parCoordsChart.on('brush', function () {
            var brushTime = new Date();
            executeOnceTimes.lastBrushTime = brushTime;
            setTimeout(function(){
                executeOnce(brushTime, 'lastBrushTime', applyBrushedData);
            }, TIMEOUT_MILLIS);
        });
    }

    function initTable(data){
        var tableData = [];
        
        var enabledContaminantsIndex = {
            o3: isContaminantEnabled('o3'),
            so2: isContaminantEnabled('so2'),
            no2: isContaminantEnabled('no2'),
            co: isContaminantEnabled('co'),
            pm10: isContaminantEnabled('pm10'),
            sh2: isContaminantEnabled('sh2')
        };

        for (var i = 0, max = data.rows.length; i < max; i++) {
            var row = data.rows[i];

            function addContaminantData(contaminant, unit) {
                if(!unit){
                    unit = 'ug/m\u00B3';
                }

                if (enabledContaminantsIndex[contaminant]) {
                    var value = contaminantToNumber(row[contaminant + '_d']);
                    if(value === undefined || value === null){
                        return;
                    }
                    
                    var date = fullTimeStringFormat.parse(row.fecha_dt);

                    var tableRow = {};
                    tableRow.contaminant = dimensions[contaminant];
                    tableRow.station = row.estacion;
                    tableRow.date = datePartFormat(date);
                    tableRow.value = value + ' ' + unit;


                    tableData.unshift(tableRow);//Add in reverse order so latest data shous up first
                }
            }

            addContaminantData('o3');
            addContaminantData('so2');
            addContaminantData('no2');
            addContaminantData('co', 'mg/m\u00B3');
            addContaminantData('pm10');
            addContaminantData('sh2');
        }

        $tableContainer.show();
        var $table  = $tableContainer.find('table');

        $table.DataTable().destroy();
        $table.DataTable({
            data: tableData,
            orderMulti: true,
            language: {
                url: 'http://cdn.datatables.net/plug-ins/1.10.7/i18n/Spanish.json'
            },
            order: [[2, 'desc']],//Initially order by date desc
            columns: [
                {data: 'contaminant'},
                {data: 'station'},
                {data: 'date', type: 'date'},
                {data: 'value'}
            ]
        });
    }

    var lastStartDate = null;
    var lastEndDate = null;
    function createChart() {
        $parallelContainer.find('.loadingIndicator').show();
        $parallelContainer.show();

        
        function showError(){
            alert("Error al obtener los datos. Por favor inténtalo más tarde");
            $parallelContainer.hide();
            $tableContainer.hide();
        }

        var startDate = $startDate.val();
        var endDate = $endDate.val();
        var doAjax = true;
        if(lastLoadedData && startDate === lastStartDate && endDate === lastEndDate){
            doAjax = false;
        }
        
        lastStartDate = startDate;
        lastEndDate = endDate;
        
        if(doAjax){
            $.ajax({
                url: options.url,
                timeout: 60 * 1000,//60 seconds
                data: {
                    start: startDate,
                    end: endDate
                },
                type: 'GET',
                dataType: 'JSON',
                success: function(data){
                    if(!data.rows){
                        showError();
                        return;
                    }

                    lastLoadedData = data;
                    initTable(data);
                    initParallelCoordinates(data);
                },
                failure: showError
            });
        }else{
            initTable(lastLoadedData);
            initParallelCoordinates(lastLoadedData);
        }
    }
    
    //Events:
    $applyButton.click(createChart);
    $opacity.change(function(){
        console.log($opacity.val());
        if(parCoordsChart){
            parCoordsChart
                    .alpha($opacity.val())
                    .render();
        }
    });

    /**
     * Check/uncheck all
     */
    $("#allContaminantsCheck").click(function () {
        var isAnyChecked = $("input[id^='check-']").filter(':checked').size();
        $("input[id^='check-']").prop('checked', !isAnyChecked);
    });
    
    window.onresize = function(){
        if(lastLoadedData){
            var resizeTime = new Date();
            executeOnceTimes.lastResize = resizeTime;
            setTimeout(function(){
                executeOnce(resizeTime, 'lastResize', function(){
                    initParallelCoordinates(lastLoadedData);
                });
            }, TIMEOUT_MILLIS);
        }
    };
    
    return self;
}