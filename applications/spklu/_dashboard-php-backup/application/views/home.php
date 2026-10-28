<div class="row">
  <div class="col-lg-3 col-xs-6">
    <div class="small-box bg-aqua">
      <div class="inner">
        <h3><?php 
         $hakakses=$this->session->type_id;
         $jml= $jml_tenant ;
        echo $jml; 
        
        ?></h3>

        <p><?php
              $hakakses=$this->session->type_id;
              $ket= "Jumlah Mitra";
           echo $ket;
            
            ?></p>
      </div>
      <div class="icon">
        <i class="ion ion-ios-contact"></i>
      </div>
      <a href="<?php echo base_url('mitra/datamitra') ?>" class="small-box-footer">More info <i class="fa fa-arrow-circle-right"></i></a>
    </div>
  </div>
   <div class="col-lg-3 col-xs-6">
    <div class="small-box bg-yellow">
      <div class="inner">
        <h3><?php echo number_format($jml_user,0); ?></h3>

        <p>Total Pengguna</p>
      </div> 
      <div class="icon">
        <i class="ion ion-beaker"></i>
      </div>
       <a href="<?php echo base_url('user/datauser') ?>" class="small-box-footer">More info <i class="fa fa-arrow-circle-right"></i></a>
    </div>
  </div>
  <div class="col-lg-3 col-xs-6">
    <div class="small-box bg-green">
      <div class="inner">
        <h3><?php echo $jml_charge; ?></h3>

        <p>Jumlah Charge Box</p>
      </div>
      <div class="icon">
        <i class="ion ion-ios-briefcase-outline"></i>
      </div>
      <a href="<?php echo base_url('chargebox/datachargebox') ?>" class="small-box-footer">More info <i class="fa fa-arrow-circle-right"></i></a>
    </div>
  </div>
 
  
   <div class="col-lg-3 col-xs-6">
    <div class="small-box bg-fuchsia">
      <div class="inner">
        <h3><?php echo number_format($jumcharging,0); ?></h3>

        <p>Jumlah Aktif Charging</p>
      </div>
      <div class="icon">
        <i class="ion ion-clipboard"></i>
      </div>
      <a href="<?php echo base_url('transaksi/datatransaksi') ?>" class="small-box-footer">More info <i class="fa fa-arrow-circle-right"></i></a>
    </div>
  </div>
  
  <!-- harian-->
  <div class="col-lg-6 col-xs-12">
    <div class="info-box bg-yellow">  
                                <span class="info-box-icon"><i class="ion ion-cash"></i></span>

                                <div class="info-box-content">
                                    <span class="info-box-text">Transaksi Harian</span>
                                     <span class="info-box-number"><?=number_format(($dataharian->total),0)?></span>

                                    <div class="progress">
                                        <div class="progress-bar" style="width: 100%"></div>
                                    </div>
                                    <span class="progress-description">
                                        <span class="label label-success">Jumlah transaksi</span> = <?=number_format($dataharian->jum,0)?> &nbsp&nbsp
                                        
                                    </span>
                                </div>
                                <!-- /.info-box-content -->
                            </div>
  
  </div>
  

  <div class="col-lg-6 col-xs-12">
     <div class="info-box bg-blue">  
                                <span class="info-box-icon"><i class="ion ion-cash"></i></span>

                                <div class="info-box-content">
                                    <span class="info-box-text">Transaksi Bulanan</span>
                                    <span class="info-box-number"><?=number_format(($databulanan->total),0)?></span>

                                    <div class="progress">
                                        <div class="progress-bar" style="width: 100%"></div>
                                    </div>
                                    <span class="progress-description">
                                        <span class="label label-success">Jumlah transaksi</span> =<?=number_format(($databulanan->jum),0)?> &nbsp&nbsp
                                       
                                        
                                    </span>
                                </div>
                                <!-- /.info-box-content -->
                            </div>
  </div>
  
  <!-- akhir harian-->
  <div class="col-lg-6 col-xs-12">
    <div class="box box-info">
      <div class="box-header with-border">
        <i class="fa fa-briefcase"></i>
        <h3 class="box-title">Statistik Jumlah Transaksi bulanan</small></h3>

        <div class="box-tools pull-right">
          <button type="button" class="btn btn-box-tool" data-widget="collapse"><i class="fa fa-minus"></i>
          </button>
          <button type="button" class="btn btn-box-tool" data-widget="remove"><i class="fa fa-times"></i></button>
        </div>
      </div>
      <div class="box-body">
        <canvas id="data-fee" style="height:250px"></canvas>
      </div>
    </div>
  </div>
  

  <div class="col-lg-6 col-xs-12">
    <div class="box box-info">
      <div class="box-header with-border">
        <i class="fa fa-briefcase"></i>
        <h3 class="box-title">Statistik Total Transaksi bulanan</h3>

        <div class="box-tools pull-right">
          <button type="button" class="btn btn-box-tool" data-widget="collapse"><i class="fa fa-minus"></i>
          </button>
          <button type="button" class="btn btn-box-tool" data-widget="remove"><i class="fa fa-times"></i></button>
        </div>
      </div>
      <div class="box-body">
        <canvas id="data-trans" style="height:250px"></canvas>
      </div>
    </div>
  </div>

 <div class="col-lg-12 col-xs-12">
    <div class="box box-info">
      <div class="box-header with-border">
        <i class="fa fa-briefcase"></i>
        <h3 class="box-title">Statistik Transaksi Harian</h3>

        <div class="box-tools pull-right">
          <button type="button" class="btn btn-box-tool" data-widget="collapse"><i class="fa fa-minus"></i>
          </button>
          <button type="button" class="btn btn-box-tool" data-widget="remove"><i class="fa fa-times"></i></button>
        </div>
      </div>
      <div class="box-body">
        <canvas id="data-transharian" style="height:250px"></canvas>
      </div>
    </div>
  </div>

<script src="<?php echo base_url(); ?>assets/plugins/chartjs/Chart.min.js"></script>
<script>
//data fee
var salesChartCanvas = $("#data-fee").get(0).getContext("2d");
                // This will get the first returned node in the jQuery collection.
                var salesChart = new Chart(salesChartCanvas);
                var namabulan=<?php echo json_encode($labelgrafikbulanan); ?>;
             

                var salesChartData = {
                    labels: namabulan,
                    datasets: [
                        {
                            label: "2016",
                            fillColor: "rgba(60,141,188,0.9)",
                            strokeColor: "rgba(60,141,188,0.8)",
                            pointColor: "#3b8bba",
                            pointStrokeColor: "rgba(60,141,188,1)",
                            pointHighlightFill: "#fff",
                            pointHighlightStroke: "rgba(60,141,188,1)",
                            data: <?php echo json_encode($grafikjumlahtransaksibulanan); ?>,
                }
            ]
        };

        var salesChartOptions = {
                scales: {
            x: {
              beginAtZero: true
            }
          },
            //Boolean - If we should show the scale at all
            showScale: true,
            //Boolean - Whether grid lines are shown across the chart
            scaleShowGridLines: false,
            //String - Colour of the grid lines
            scaleGridLineColor: "rgba(0,0,0,.05)",
            //Number - Width of the grid lines
            scaleGridLineWidth: 1,
            //Boolean - Whether to show horizontal lines (except X axis)
            scaleShowHorizontalLines: true,
            //Boolean - Whether to show vertical lines (except Y axis)
            scaleShowVerticalLines: true,
            //Boolean - Whether the line is curved between points
            bezierCurve: true,
            //Number - Tension of the bezier curve between points
            bezierCurveTension: 0.3,
            //Boolean - Whether to show a dot for each point
            pointDot: true,
            //Number - Radius of each point dot in pixels
            pointDotRadius: 4,
            //Number - Pixel width of point dot stroke
            pointDotStrokeWidth: 1,
            //Number - amount extra to add to the radius to cater for hit detection outside the drawn point
            pointHitDetectionRadius: 20,
            //Boolean - Whether to show a stroke for datasets
            datasetStroke: true,
            //Number - Pixel width of dataset stroke
            datasetStrokeWidth: 2,
            //Boolean - Whether to fill the dataset with a color
            datasetFill: false,
            //String - A legend template
            legendTemplate: "<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].lineColor%>\"></span><%=datasets[i].label%></li><%}%></ul>",
            //Boolean - whether to maintain the starting aspect ratio or not when responsive, if set to false, will take up entire container
            maintainAspectRatio: true,
            //Boolean - whether to make the chart responsive to window resizing
            responsive: true
        };

        //Create the line chart
        salesChart.Bar(salesChartData, salesChartOptions);
  
  //data bulanan jumlah transaksi
  
  var salesChartCanvas = $("#data-trans").get(0).getContext("2d");
                // This will get the first returned node in the jQuery collection.
                var salesChart = new Chart(salesChartCanvas);
                var namabulan=<?php echo json_encode($labelgrafikbulanan); ?>;
             

                var salesChartData = {
                    labels:namabulan,
                    datasets: [
                        {
                            label: "2016",
                            fillColor: "rgba(60,141,188,0.9)",
                            strokeColor: "rgba(60,141,188,0.8)",
                            pointColor: "#3b8bba",
                            pointStrokeColor: "rgba(60,141,188,1)",
                            pointHighlightFill: "#fff",
                            pointHighlightStroke: "rgba(60,141,188,1)",
                            data: <?php echo json_encode($grafiktotaltransaksibulanan); ?>,
                }
            ]
        };

       var salesChartOptions = {
            //Boolean - If we should show the scale at all
            showScale: true,
            //Boolean - Whether grid lines are shown across the chart
            scaleShowGridLines: false,
            //String - Colour of the grid lines
            scaleGridLineColor: "rgba(0,0,0,.05)",
            //Number - Width of the grid lines
            scaleGridLineWidth: 1,
            //Boolean - Whether to show horizontal lines (except X axis)
            scaleShowHorizontalLines: true,
            //Boolean - Whether to show vertical lines (except Y axis)
            scaleShowVerticalLines: true,
            //Boolean - Whether the line is curved between points
            bezierCurve: true,
            //Number - Tension of the bezier curve between points
            bezierCurveTension: 0.3,
            //Boolean - Whether to show a dot for each point
            pointDot: true,
            //Number - Radius of each point dot in pixels
            pointDotRadius: 4,
            //Number - Pixel width of point dot stroke
            pointDotStrokeWidth: 1,
            //Number - amount extra to add to the radius to cater for hit detection outside the drawn point
            pointHitDetectionRadius: 20,
            //Boolean - Whether to show a stroke for datasets
            datasetStroke: true,
            //Number - Pixel width of dataset stroke
            datasetStrokeWidth: 2,
            //Boolean - Whether to fill the dataset with a color
            datasetFill: false,
            //String - A legend template
            legendTemplate: "<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].lineColor%>\"></span><%=datasets[i].label%></li><%}%></ul>",
            //Boolean - whether to maintain the starting aspect ratio or not when responsive, if set to false, will take up entire container
            maintainAspectRatio: true,
            //Boolean - whether to make the chart responsive to window resizing
            responsive: true
        };

        //Create the line chart
        salesChart.Bar(salesChartData, salesChartOptions);
 
  var salesChartCanvas = $("#data-transharian").get(0).getContext("2d");
                // This will get the first returned node in the jQuery collection.
                var salesChart = new Chart(salesChartCanvas);
                var tanggal=[];
              var jumlahhari=<?php echo $jumlahhari;?>;
                for(i=0;i< jumlahhari;i++){
                    tanggal[i]=i+1;
                }

                var salesChartData = {
                    labels:tanggal,
                    datasets: [
                        {
                            label: "2016",
                            fillColor: "rgba(60,141,188,0.9)",
                            strokeColor: "rgba(60,141,188,0.8)",
                            pointColor: "#3b8bba",
                            pointStrokeColor: "rgba(60,141,188,1)",
                            pointHighlightFill: "#fff",
                            pointHighlightStroke: "rgba(60,141,188,1)",
                            data: <?php echo json_encode($grafiktransaksiharian); ?>,
                }
            ]
        };

       var salesChartOptions = {
            //Boolean - If we should show the scale at all
            showScale: true,
            //Boolean - Whether grid lines are shown across the chart
            scaleShowGridLines: false,
            //String - Colour of the grid lines
            scaleGridLineColor: "rgba(0,0,0,.05)",
            //Number - Width of the grid lines
            scaleGridLineWidth: 1,
            //Boolean - Whether to show horizontal lines (except X axis)
            scaleShowHorizontalLines: true,
            //Boolean - Whether to show vertical lines (except Y axis)
            scaleShowVerticalLines: true,
            //Boolean - Whether the line is curved between points
            bezierCurve: true,
            //Number - Tension of the bezier curve between points
            bezierCurveTension: 0.3,
            //Boolean - Whether to show a dot for each point
            pointDot: true,
            //Number - Radius of each point dot in pixels
            pointDotRadius: 4,
            //Number - Pixel width of point dot stroke
            pointDotStrokeWidth: 1,
            //Number - amount extra to add to the radius to cater for hit detection outside the drawn point
            pointHitDetectionRadius: 20,
            //Boolean - Whether to show a stroke for datasets
            datasetStroke: true,
            //Number - Pixel width of dataset stroke
            datasetStrokeWidth: 2,
            //Boolean - Whether to fill the dataset with a color
            datasetFill: false,
            //String - A legend template
            legendTemplate: "<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].lineColor%>\"></span><%=datasets[i].label%></li><%}%></ul>",
            //Boolean - whether to maintain the starting aspect ratio or not when responsive, if set to false, will take up entire container
            maintainAspectRatio: true,
            //Boolean - whether to make the chart responsive to window resizing
            responsive: true
        };

        //Create the line chart
        salesChart.Line(salesChartData, salesChartOptions);


  
</script>