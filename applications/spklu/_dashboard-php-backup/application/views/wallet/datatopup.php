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
   
	  <div class="table-responsive" style="min-height: 500px;">
    <table id="list-data" class="table table-bordered table-striped">
      <thead>
        <tr>
          <th  class="text-center">Nomor Topup</th>
		  <th  class="text-center">Tgl.Topup</th>
          <th  class="text-center">User</th>
		  <th  class="text-center">Email</th>
		  <th  class="text-center">Telp</th>
		  <th  class="text-center">Jml.Topup</th>
		  
		  <th  class="text-center">Tgl.Expired</th>
		  <th  class="text-center">Status Topup</th>
		  <th></th>
        </tr>
      </thead>
     
    </table>
	</div>
  </div>
</div>

 
  
  
  

<div id="tempat-modal"></div>

<script type="text/javascript">

    $(document).ready(function() {
		
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
	
	$('#modaltambah').on('shown.bs.modal', function() {
  $('#txtnama').focus();
})
	

	
	function simpanubah(){
	
		 var _nama=$('#txtnamaubah').val();
		 var _email=$('#txtemailubah').val();
		 var _telp=$('#txttelpubah').val();
		
			
		
          if(_nama==null || _nama=="") {
			  alert("Nama Mitra harus diisi!"); return;
		  }
		  
		  if(_email==null || _email=="") {
			  alert("Email harus diisi!"); return;
		  }
		 
		
		
            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('mitra/simpanubah')?>",
               // dataType : "JSON",
                data : { 
							id:_idubah,
							name:_nama,
							email:_email,
							no_hp:_telp,
							
						
							
				
				},
                success: function(response){
					
                    var table = $('#list-data').DataTable();
					table.draw(false);
					
					$('#modalubah').modal('hide');
                    
                },
				
            });
	}
	
	
	
	function ubah(id){
	if (confirm("Ubah status menjadi selesai diproses?")==false) return;
            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('wallet/ubahstatus')?>",
               // dataType : "JSON",
                data : { id:id,
						
				
				},
                success: function(response){
					
                    
                    var table = $('#list-data').DataTable();
					table.draw(false);;
					
					
                    
                },
				
            });
               
	 }
	function getdata(){
		
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
			      filename : "topup",
				    exportOptions: {
                    columns: [ 0,1,2,3,4,5,6,7]
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
	 {targets: [5],
         className: 'right'
     },
	 {targets: [-2],
        "className": "text-center",
     },
	 ],
    "ordering": true,
    "searching": true,
    "serverSide": true,
	"bDestroy": true,
    "order": [0,'desc'],
 
  "ajax":{
          url :"<?php echo base_url('wallet/datatopupjson'); ?>", // json datasource
          type: "post",
			  // method  , by default get
          
        },
		
		
		"columns": [
			
			{ "data": "no_trans"},
			{ "data": "tgl_topup"},
			{ "data": "nama"},
			{ "data": "email"},
			{ "data": "no_hp"},
			{ "data": "jml_topup"},
			
			{ "data": "tgl_expired"},
			{ "data": "status_topup"},
			{ "data": "id"},
			
		]
  
  });
 
	}
	
	function tambahpelanggan(){
		 $('#modaltambah').modal('show');
	}
	
</script>
