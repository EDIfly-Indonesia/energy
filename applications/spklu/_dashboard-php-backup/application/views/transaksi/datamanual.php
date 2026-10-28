<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-select/1.13.2/css/bootstrap-select.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-select/1.13.2/js/bootstrap-select.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.36/pdfmake.min.js"></script>
<script src="https://cdn.datatables.net/buttons/1.5.2/js/buttons.html5.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js"></script>
<style>
  div.dt-buttons {
   
    margin-right: 20px;
}
.table th {
  text-align: center;
}
#right{float:right}

.right {
                text-align: right;
            }
			.center {
                text-align: center;
            }
</style>

<div class="msg" style="display:none;">
  <?php  echo @$this->session->flashdata('msg'); ?>
</div>

<div class="box">
  
  <!-- /.box-header -->
  <div class="box-body">
     <div class="form-group row">
   
    <div class="col-md-6">
         <div class="form-group row">
            <label class="col-md-3"><input type="radio" name="optjeniswaktu" value="1">&nbsp; Bulanan</label>
                    
                     <div class="col-md-4">
                       <select name="txtbulan" id="txtbulan" class="form-control" data-placeholder="Pilih Bulan" onchange="getdata()" required>
                          
                           
                        </select>
                    </div>
                    
                    <div class="col-md-4">
                      <select name="txttahun" id="txttahun" class="form-control" data-placeholder="Pilih Tahun" onchange="getdata()" required>-->
                          
                           
                      </select>
                    </div>
                    
                </div>
    </div>
  
   <div class="col-md-6">
         <div class="form-group row">
            <label class="col-md-2"><input type="radio" name="optjeniswaktu" value="0">&nbsp; Harian</label>
                    
                     <div class="col-md-3">
                      <input type="date" id="tgl1" name="tgl1" value="<?php echo date('Y-m-d'); ?>">
                    </div>
                   <div class="col-md-1">sd
                       </div>
                    <div class="col-md-3">
                      <input type="date" id="tgl2" name="tgl2" value="<?php echo date('Y-m-d'); ?>">
                    </div>
                    <div class="col-md-3"><button type="button" class="btn btn-primary" onclick="getdata();";>Lihat</button>
                       </div>
                </div>
    </div>
    </div>
 
    <div class="form-group row">
   
  
  <div class="col-md-3">
  <div class="form-group row">
                    <label for="" class="col-md-4 col-form-label">Mitra</label>
                     <div class="col-md-6">
                        <select name="txtmitra" id="txtmitra" class="selectpicker form-control" data-live-search="true" onchange="getdata()" required>
                           <option value="semua">Semua</option>
                           <?php foreach($datatenant as $u):?>
                                <option value="<?php echo $u->id?>"><?php echo $u->name; ?></option>
                            <?php endforeach;?>
                        </select>
                    </div>
                </div>
   </div>

   <div class="col-md-5">
  <div class="form-group row">
                    <label for="" class="col-md-4 col-form-label">Charge box</label>
                     <div class="col-md-6">
                        <select name="txtchargebox" id="txtchargebox" class="selectpicker form-control" data-live-search="true" onchange="getdata()" required>
                           <option value="semua">Semua</option>
                           <?php foreach($datachargebox as $u):?>
                                <option value="<?php echo $u->id?>"><?php echo $u->name; ?></option>
                            <?php endforeach;?>
                        </select>
                    </div>
                </div>
   </div>
   </div>

	  <div class="table-responsive" style="min-height: 500px;">
	  	
    <br><table id="list-data" class="table table-bordered table-striped">
      <thead>
        <tr>
	
          <th>Nomor Transaksi</th>
          <th>Mitra</th>
          <th>ChargeBox ID</th>
          <th>Id Konektor</th>
		  <th>Used value(kwh)</th>
          <th>Start time</th>
          <th>Stop time</th>
		 
         
        
        </tr>
      </thead>
     
    </table>
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
    var _mitra=$('#txtmitra').val();
    var _status=$('#txtstatus').val();
    var _chargebox=$('#txtchargebox').val();
    

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
			      filename : "transaksiManual",
				    exportOptions: {
                    columns: [ 1,2,3,4,5,6]
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
	
	 {targets: [4],
         className: 'right'
     },
    
	  
	 ],
    "ordering": true,
    "searching": true,
    "serverSide": true,
	"bDestroy": true,
    "order": [0,'desc'],
 
  "ajax":{
          url :"<?php echo base_url('transaksi/manualtransaksijson'); ?>", // json datasource
          type: "post",
		    data : {jeniswaktu: vjeniswaktu,
                tanggal1: _tanggal1,
    		    tanggal2: _tanggal2,
                bulan: _bulan,
			    tahun: _tahun,
                mitra: _mitra,
                chargebox: _chargebox,
					      


        },
			  // method  , by default get
          
        },
 // <th>Nomor Transaksi</th>
          // <th>Mitra</th>
          // <th>ChargeBox ID</th>
          // <th>Id Konektor</th>
		  // <th>Penggunan(kwh)</th>
          // <th>Start time</th>
          // <th>Stop time</th>
       
		
		"columns": [
			
			{ "data": "id"},
			
			{ "data": "mitra"},
			{ "data": "chargebox_id"},
			{ "data": "connector_id"},
			{ "data": "penggunaan"},
			
			{ "data": "start_timestamp"},
			{ "data": "stop_timestamp"},
			
			
			
		]
  
  });
 
	}

  function ubah(id){
	
    if (confirm("Ubah jadi checkout?") == false)  return false;
   
    $.ajax({
             type : "POST",
             url  : "<?php echo base_url('transaksi/simpanubahstatus')?>",
            // dataType : "JSON",
             data : { 
           id:id,
           
     
     },
             success: function(response){
       
                 var table = $('#list-data').DataTable();
                table.draw(false);
       
     
                 
             },
     
         });
}
	
	function tambahpelanggan(){
		 $('#modaltambah').modal('show');
	}
	
</script>
