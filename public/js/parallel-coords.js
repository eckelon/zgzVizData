/* global d3, dataTables */
function ContaminantsChart(inputOptions){
    var defaultOptions = {
        url: '/data'
    };
    
    var options = $.extend({}, defaultOptions, inputOptions);
    
    var self = this;
    
    var allContaminants = [
        'o3', 'so2', 'no2', 'co', 'pm10', 'sh2'
    ];

    //jQuery cached objects
    var $parallelContainer = $("#parallel-container");
    var $tableContainer = $("#table-container");
    var $applyButton = $("#apply");
    var $startDate = $("#startDate");
    var $endDate = $("#endDate");

    var datepickerFormat = d3.time.format("%Y-%m-%d");

    //Initialize some values:
    var today = new Date();
    var todayMinus1Year = new Date(today - 86400 * 1000 * 365);

    $endDate.val(datepickerFormat(today));
    $startDate.val(datepickerFormat(todayMinus1Year));//About one year before...
    
    //Private variables and functions:
    var parCoordsChart = null;

    function isContaminantEnabled(contaminant) {
        return $("#check-" + contaminant).is(':checked');
    }
    
    function createChart() {
        $parallelContainer.html('<div class="loadingIndicator"><i class="uk-icon uk-icon-spinner uk-icon-spin"></i></div>');
        $parallelContainer.show();

        $.ajax({
            url: options.url,
            data: {
                start: $startDate.val(),
                end: $endDate.val()
            },
            type: 'GET',
            dataType: 'JSON',
            success: function(data){
                if(!data.rows){
                    alert("Error al obtener los datos. Por favor inténtalo más tarde");
                    $parallelContainer.hide();
                    $tableContainer.hide();
                    return;
                }
                
                initTable(data);
                initParallelCoordinates(data);
            }
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

            if ($.inArray(prop, allContaminants) !== -1 && !isContaminantEnabled(prop)) {
                continue;
            }

            var name = dimensions[prop];
            dataTypes[name] = 'number';
            dimensionNames.push(name);
        }

        dataTypes[dimensions.station] = 'string';

        var fullTimeStringFormat = d3.time.format('%Y-%m-%dT%H:%M:%SZ');
        var datePartFormat = d3.time.format('%Y-%m-%d');
        var hourOfDayPartFormat = d3.time.format('%H:%M:%S');
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
            $parallelContainer.find('.loadingIndicator').remove();

            var parallelsData = [
            ];
            
            for (var i = 0, max = data.rows.length; i < max; i++) {
                var row = data.rows[i];

                var date = fullTimeStringFormat.parse(row.fecha_dt);

                var parallelRow = {};

                parallelRow[dimensions.station] = row.estacion;
                parallelRow[dimensions.year] = Number(yearPartFormat(date));
                parallelRow[dimensions.month] = getMonthFromDate(date);
                parallelRow[dimensions.day] = Number(dayPartFormat(date));

                function addContaminantData(contaminant) {
                    if (isContaminantEnabled(contaminant)) {
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
                    .margin({top: 24, left: 100, bottom: 12, right: 0})
                    .mode("queue")
                    .autoscale()
                    .alpha(0.2)
                    .color(function (d) {
                        return colorScale(d[dimensions.station]);
                    })
                    .render()
                    .brushMode("1D-axes")  // enable brushing
                    .reorderable()
                    ;


            parCoordsChart.on('brush', function () {
                console.log(parCoordsChart.brushed().length);
            });
        }
        
        function initTable(data){
            var tableData = [];
            
            for (var i = 0, max = data.rows.length; i < max; i++) {
                var row = data.rows[i];
                
                function addContaminantData(contaminant) {
                    if (isContaminantEnabled(contaminant)) {
                        var date = fullTimeStringFormat.parse(row.fecha_dt);
                        
                        var tableRow = {};
                        tableRow.contaminant = dimensions[contaminant];
                        tableRow.station = row.estacion;
                        tableRow.date = datePartFormat(date);
                        tableRow.time = hourOfDayPartFormat(date);
                        
                        var value = contaminantToNumber(row[contaminant + '_d']);
                        if(value === undefined){
                            value = "---";
                        }
                        
                        tableRow.value = value;
                        
                        tableData.unshift(tableRow);//Add in reverse order so latest data shous up first
                    }
                }
                
                addContaminantData('o3');
                addContaminantData('so2');
                addContaminantData('no2');
                addContaminantData('co');
                addContaminantData('pm10');
                addContaminantData('sh2');
            }
            
            $tableContainer.show();
            var $table  = $tableContainer.find('table');
            
            $table.DataTable().destroy();
            $table.DataTable({
                data: tableData,
                pageLength: 100,
                orderMulti: true,
                language: {
                    url: '//cdn.datatables.net/plug-ins/1.10.7/i18n/Spanish.json'
                },
                order: [[2, 'desc']],//Initially order by date desc
                columns: [
                    {data: 'contaminant'},
                    {data: 'station'},
                    {data: 'date', type: 'date'},
                    {data: 'time'},
                    {data: 'value'}
                ]
            });
        }
    }
    
    //Events:
    $applyButton.click(createChart);

    /**
     * Check/uncheck all
     */
    $("#allContaminantsCheck").click(function () {
        var isAnyChecked = $("input[id^='check-']").filter(':checked').size();
        $("input[id^='check-']").prop('checked', !isAnyChecked);
    });
    
    window.onresize = function(){
        if(parCoordsChart){
            parCoordsChart.width($parallelContainer.width());
            parCoordsChart.render();
        }
    };
    
    return self;
}