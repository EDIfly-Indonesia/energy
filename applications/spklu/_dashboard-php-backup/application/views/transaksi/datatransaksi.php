
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-select/1.13.2/css/bootstrap-select.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-select/1.13.2/js/bootstrap-select.min.js"></script>
<style>
  div.dt-buttons {
    margin-right: 20px;
  }

  .table th {
    text-align: center;
    vertical-align: middle !important;
    white-space: nowrap;
  }

  .table td {
    vertical-align: middle !important;
  }

  #right {
    float: right;
  }

  .right {
    text-align: right;
  }

  .center {
    text-align: center;
  }

  .filter-panel {
    margin-bottom: 20px;
  }

  .filter-panel .box-header {
    padding-bottom: 0;
  }

  .filter-section {
    border: 1px solid #e5e5e5;
    border-radius: 4px;
    padding: 15px 15px 5px;
    margin-bottom: 15px;
    background: #fafafa;
    min-height: 110px;
  }

  .filter-section-title {
    display: block;
    margin-bottom: 12px;
    font-weight: 600;
    color: #333;
  }

  .filter-section .form-group {
    margin-bottom: 10px;
  }

  .filter-section label {
    font-weight: 500;
  }

  .filter-section input[type="date"] {
    width: 100%;
  }

  .filter-actions {
    padding-top: 24px;
  }

  .summary-row {
    margin-bottom: 15px;
  }

  .summary-row .small-box {
    margin-bottom: 15px;
  }

  .data-table-panel {
    border-top: 1px solid #f4f4f4;
    padding-top: 15px;
  }

  .table-responsive {
    width: 100%;
  }

  @media (max-width: 991px) {
    .filter-section {
      min-height: auto;
    }

    .filter-actions {
      padding-top: 0;
    }
  }
</style>

<div class="msg" style="display:none;">
  <?php  echo @$this->session->flashdata('msg'); ?>
</div>

<div class="box filter-panel">
  <div class="box-header with-border">
    <h3 class="box-title">Filter Transaksi</h3>
  </div>
  <div class="box-body">
    <div class="row">
      <div class="col-md-6">
        <div class="filter-section">
          <span class="filter-section-title">
            <input type="radio" name="optjeniswaktu" value="1">&nbsp; Periode Bulanan
          </span>
          <div class="row">
            <div class="col-sm-6">
              <div class="form-group">
                <label>Bulan</label>
                <select name="txtbulan" id="txtbulan" class="form-control" data-placeholder="Pilih Bulan" onchange="getdata()" required>
                </select>
              </div>
            </div>
            <div class="col-sm-6">
              <div class="form-group">
                <label>Tahun</label>
                <select name="txttahun" id="txttahun" class="form-control" data-placeholder="Pilih Tahun" onchange="getdata()" required>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-md-6">
        <div class="filter-section">
          <span class="filter-section-title">
            <input type="radio" name="optjeniswaktu" value="0">&nbsp; Periode Harian
          </span>
          <div class="row">
            <div class="col-sm-4">
              <div class="form-group">
                <label>Tanggal Awal</label>
                <input type="date" id="tgl1" name="tgl1" class="form-control" value="<?php echo date('Y-m-d'); ?>">
              </div>
            </div>
            <div class="col-sm-4">
              <div class="form-group">
                <label>Tanggal Akhir</label>
                <input type="date" id="tgl2" name="tgl2" class="form-control" value="<?php echo date('Y-m-d'); ?>">
              </div>
            </div>
            <div class="col-sm-4 filter-actions">
              <button type="button" class="btn btn-primary btn-block" onclick="getdata();">Lihat</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="filter-section">
      <span class="filter-section-title">Filter Tambahan</span>
      <div class="row">
        <div class="col-md-3 col-sm-6">
          <div class="form-group">
            <label>Status</label>
            <select name="txtstatus" id="txtstatus" class="form-control" data-placeholder="Pilih Jenis" onchange="getdata()" required>
              <option value="semua">Semua</option>
              <option value="order">order</option>
              <option value="finish">finish</option>
              <option value="charging">charging</option>
              <option value="ready">ready</option>
              <option value="expired">expired</option>
            </select>
          </div>
        </div>

        <div class="col-md-3 col-sm-6">
          <div class="form-group">
            <label>Mitra</label>
            <select name="txttenant" id="txttenant" class="selectpicker form-control" data-live-search="true" onchange="getdata()" required>
              <option value="semua">Semua</option>
              <?php foreach($datatenant as $u):?>
                <option value="<?php echo $u->id?>"><?php echo $u->name; ?></option>
              <?php endforeach;?>
            </select>
          </div>
        </div>

        <div class="col-md-3 col-sm-6">
          <div class="form-group">
            <label>Charge box</label>
            <select name="txtchargebox" id="txtchargebox" class="selectpicker form-control" data-live-search="true" onchange="getdata()" required>
              <option value="semua">Semua</option>
              <?php foreach($datachargebox as $u):?>
                <option value="<?php echo $u->id?>"><?php echo $u->name; ?></option>
              <?php endforeach;?>
            </select>
          </div>
        </div>

        <div class="col-md-3 col-sm-6">
          <div class="form-group">
            <label>User</label>
            <select name="txtuser" id="txtuser" class="selectpicker form-control" data-live-search="true" data-placeholder="Pilih User" onchange="getdata()" required>
              <option value="semua">Semua</option>
              <?php foreach($datauser as $u):?>
                <option value="<?php echo $u->id?>"><?php echo $u->name; ?></option>
              <?php endforeach;?>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="row summary-row">
      <div class="col-md-3 col-sm-6">
        <div class="small-box bg-green">
				<div class="inner">
					<h3 id="total-emisi-karbon">0</h3>
					<p>Total Emisi Karbon (kg CO2e)</p>
				</div>
				<div class="icon">
					<i class="fa fa-leaf"></i>
				</div>
			</div>
      </div>
      <div class="col-md-3 col-sm-6">
        <div class="small-box bg-aqua">
				<div class="inner">
					<h3 id="total-kwh-terpakai">0</h3>
					<p>Total kWh Terpakai</p>
				</div>
				<div class="icon">
					<i class="fa fa-bolt"></i>
				</div>
			</div>
      </div>
    </div>

    <div class="data-table-panel">
      <div class="table-responsive" style="min-height: 500px;">
    <table id="list-data" class="table table-bordered table-striped table-hover">
      <thead>
        <tr>
          <th  class="text-center">No.Trans</th>
		  <th  class="text-center">Tgl.Trans</th>
          <th  class="text-center">Waktu Bayar</th>
		   
		  <th>Mitra</th>
          <th>ChargeBox ID</th>
          <th>Id Konektor</th>
		  <th>Tipe charging</th>
          <th>Order kwh</th>
		  <th>Kwh terpakai</th>
		 
		  <th>Biaya lain Rp.</th>
          <th>Subttl Rp.</th>
		  <th>Total Rp.</th>
		  <th>Start time</th>
		  <th>Stop time</th>
		  <th>Alasan Stop</th>
          <th>Status</th>
		  <th>Refund</th>
          <th>Stts Refund</th>
         <th></th>
        </tr>
      </thead>
     
    </table>
      </div>
    </div>
  </div>
</div>

 
  
  
 
  

<div id="tempat-modal"></div>

<script type="text/javascript">
var vjeniswaktu=1;
var bulan=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    $(document).ready(function() {
		
		var html = "";
		var ket="";
		const d = new Date();
		let month = d.getMonth()+1;
		let year = d.getFullYear();
		for(i=1; i<=12; i++){
								
								if(i==month) ket="selected";
								
								
                            html += '<option value='+i+' '+ ket +'>'+bulan[(i-1)]+'</option>';
							ket="";
							
							
						
						}
						$('#txtbulan').html(html);
						
						html = "";
						for(i=2021; i<=2100; i++){
								
								if(i==year) ket="selected";
								
								
                            html += '<option value='+i+' '+ ket +'>'+i+'</option>';
							ket="";
							
							
						
						}	
			$('#txttahun').html(html);
			document.querySelector("input[value='"+vjeniswaktu+"']").checked = true;
		getdata();
	});
	
	function newexportaction(e, dt, button, config) {
         var self = this;
         var oldStart = dt.settings()[0]._iDisplayStart;
         dt.one('preXhr', function (e, s, data) {
             // Just this once, load all data from the server...
             data.start = 0;
             data.length = 2147483647;
             dt.one('preDraw', function (e, settings) {
                 // Call the original action function
                 if (button[0].className.indexOf('buttons-copy') >= 0) {
                     $.fn.dataTable.ext.buttons.copyHtml5.action.call(self, e, dt, button, config);
                 } else if (button[0].className.indexOf('buttons-excel') >= 0) {
                     $.fn.dataTable.ext.buttons.excelHtml5.available(dt, config) ?
                         $.fn.dataTable.ext.buttons.excelHtml5.action.call(self, e, dt, button, config) :
                         $.fn.dataTable.ext.buttons.excelFlash.action.call(self, e, dt, button, config);
                 } else if (button[0].className.indexOf('buttons-csv') >= 0) {
                     $.fn.dataTable.ext.buttons.csvHtml5.available(dt, config) ?
                         $.fn.dataTable.ext.buttons.csvHtml5.action.call(self, e, dt, button, config) :
                         $.fn.dataTable.ext.buttons.csvFlash.action.call(self, e, dt, button, config);
                 } else if (button[0].className.indexOf('buttons-pdf') >= 0) {
                     $.fn.dataTable.ext.buttons.pdfHtml5.available(dt, config) ?
                         $.fn.dataTable.ext.buttons.pdfHtml5.action.call(self, e, dt, button, config) :
                         $.fn.dataTable.ext.buttons.pdfFlash.action.call(self, e, dt, button, config);
                 } else if (button[0].className.indexOf('buttons-print') >= 0) {
                     $.fn.dataTable.ext.buttons.print.action(e, dt, button, config);
                 }
                 dt.one('preXhr', function (e, s, data) {
                     // DataTables thinks the first item displayed is index 0, but we're not drawing that.
                     // Set the property to what it was before exporting.
                     settings._iDisplayStart = oldStart;
                     data.start = oldStart;
                 });
                 // Reload the grid with the original page. Otherwise, API functions like table.cell(this) don't work properly.
                 setTimeout(dt.ajax.reload, 0);
                 // Prevent rendering of the full data to the DOM
                 return false;
             });
         });
         // Requery the server with the new one-time export settings
         dt.ajax.reload();
     }
	$('input:radio[name="optjeniswaktu"]').change(
    function(){
        if ($(this).is(':checked')) {
			vjeniswaktu=$(this).val();
		  if(vjeniswaktu==1)	getdata();
        }
    });
	
	function getdata(){
		var _tanggal1=$('#tgl1').val();
		var _tanggal2=$('#tgl2').val();
		var _bulan=$('#txtbulan').val();
		var _tahun=$('#txttahun').val();
		var _tenant=$('#txttenant').val();
		var _status=$('#txtstatus').val();
		var _chargebox=$('#txtchargebox').val();
		var _user=$('#txtuser').val();
		var datatable=   $('#list-data').DataTable( {
       dom: 'Blfrtip',
        buttons: [
        //  'pdfHtml5','excelHtml5',
           
            { extend: 'excel', 
              footer: true,
              //"text": '<button class="btn"><i class="fa fa-file-excel-o" style="color: green;"></i>  Excel</button>',
              "titleAttr": 'Excel',
              "action": newexportaction
             ,
			      filename : "transaksi",
				    exportOptions: {
                    columns: [ 0,1,2,3,4,5,6,7,8,9,10,11,12,13,15,16,17]
                }			
              },
              
           
      
        
    ],
        "processing" : true,
        "oLanguage": {
                "sLengthMenu": "Tampilkan _MENU_ data per halaman",
                "sSearch": "Pencarian: ",
                "sZeroRecords": "Maaf, tidak ada data yang ditemukan",
               "sInfo": "Menampilkan _START_ s/d _END_ dari _TOTAL_ data",
				//"sInfo": "",
                "sInfoEmpty": "Menampilkan 0 s/d 0 dari 0 data",
                "sInfoFiltered": "(di filter dari _MAX_ total data)",
                "oPaginate": {
                    "sFirst": "<<",
                    "sLast": ">>",
                    "sPrevious": "<",
                    "sNext": ">"
               }
            },
  columnDefs: [{
        targets: [0],
        orderable: false
     },
	 {targets: [-1],
         visible: false
     },
	 {targets: [-2],
        "className": "text-center",
     },
	 {targets: [7,8,9,10,11,-3],
         className: 'right'
     },
	 ],
    "ordering": true,
    "searching": true,
    "serverSide": true,
	"bDestroy": true,
	"order": [1,'desc'],
    
 
  "ajax":{
          url :"<?php echo base_url('transaksi/datatransaksijson'); ?>", // json datasource
          type: "post",
		   data : {jeniswaktu: vjeniswaktu,
                tanggal1: _tanggal1,
    		    tanggal2: _tanggal2,
                bulan: _bulan,
				tahun: _tahun,
                status: _status,
				tenant: _tenant,
				user: _user,
                chargebox: _chargebox,
					      


        },
		   dataSrc: function(json) {
			   $('#total-emisi-karbon').text(json.total_emisi_karbon || '0');
			   $('#total-kwh-terpakai').text(json.total_kwh_terpakai || '0');
			   return json.data;
		   },
			  // method  , by default get
          
        },
		
		"columns": [
			
			{ "data": "no_trans"},
				{"data": "tgl_trans"},
			{ "data": "tgl_bayar"},
			{ "data": "mitra"},
			{ "data": "chargebox_id"},
			{ "data": "connector_id"},
			
			{ "data": "tipe_charging"},
			{ "data": "jml_kwh_order"},
			{ "data": "terpakai"},
			{ "data": "biaya_lain"},
			{ "data": "total"},
			{ "data": "grand_total"},
			
			{ "data": "start_timestamp"},
			{ "data": "stop_timestamp"},
			{ "data": "stop_reason"},
			{ "data": "status_transaksi"},
			{ "data": "ttl_refund"},
			{ "data": "status_refund"},
			{ "data": "id"},
			
		]
  
  });
 
	}
	
	function tambahpelanggan(){
		 $('#modaltambah').modal('show');
	}
	
</script>
