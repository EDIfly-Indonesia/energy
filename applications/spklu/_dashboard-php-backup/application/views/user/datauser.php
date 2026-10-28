<style>

#right{float:right}
</style>

<div class="msg" style="display:none;">
  <?php  echo @$this->session->flashdata('msg'); ?>
</div>

<div class="box">
  
  <!-- /.box-header -->
  <div class="box-body">
   <?php
			if($access->c) {?>
  	<div class="btn-group" id="right">
						<a href="javascript:void(0);" class="btn btn-primary float-right" onclick="tambahpelanggan();">Tambah</a>
						
	</div><br><br>
	<?php }?>
	  <div class="table-responsive" style="min-height: 500px;">
    <table id="list-data" class="table table-bordered table-striped">
      <thead>
        <tr>
          <th  class="text-center">Nama </th>
          <th  class="text-center">Email</th>
		  <th  class="text-center">No.HP</th>
		  <th  class="text-center">Id Wallet</th>
		  <th  class="text-center">Tgl.Daftar</th>
          <th  class="text-center">Aksi</th>
          <th></th>
        </tr>
      </thead>
     
    </table>
	</div>
  </div>
</div>

 
  
  
  <div class="modal fade" id="modalubah" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header bg-primary">
          <h3 class="modal-title text-white">Ubah Data</h3>
          <button class="close" type="button" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true" class="text-white">×</span>
          </button>
        </div>
      
        <div class="modal-body">
         <form>
             
				<div class="form-group">
				 <input type="hidden" name="idubah" class="form-control" id="idubah"
                                    <label for="exampleInputOwnerName">Nama Mitra  </label>
                  <input type="text" name="txtnamaubah" class="form-control" id="txtnamaubah"
                         placeholder="Enter Nama Tenant">
                </div>

               <div class="form-group">
                  <label for="exampleInputEmail1">Email</label>
                  <input type="email" name="txtemailubah" class="form-control" id="txtemailubah"
                         placeholder="Enter Deskripsi">
                </div>
				
				 <div class="form-group">
                  <label for="exampleInputEmail1">Telp</label>
                  <input type="email" name="txttelpubah" class="form-control" id="txttelpubah"
                         placeholder="Enter Deskripsi">
                </div>
			
			
        </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" type="button" data-dismiss="modal">Batal</button>
          <button class="btn btn-primary" id="btn_add" onclick="simpanubah();" >Simpan</button>
        </div>
       
      </div>
    </div>
  </div>
  

<div id="tempat-modal"></div>

<script type="text/javascript">
var _idubah=0;
var _idalamat=0;
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
	
	function kosong(){
		$('#txtnama').val("");
		$('#txtemail').val("");
		$('#txttelp').val("");
		
	}
	
	
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
	
	function hapus(id){
		if (confirm("Yakin hapus?")==false) return;
            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('user/hapus')?>",
               // dataType : "JSON",
                data : { id:id,
						
				
				},
                success: function(response){
					
                    
                    var table = $('#list-data').DataTable();
					table.draw(false);;
					
					
                    
                },
				
            });
	}
	
	function ubah(id){
		 	


	 $.ajax({
                    url : "<?php echo base_url('mitra/getdataubah');?>",
                    method : "POST",
                   data: {id:id},
                   dataType : 'json',
                    success: function(data){
						
						_idubah=data.id_mitra;
					$('[name="idubah"]').val(data.id_mitra);
					  $('[name="txtnamaubah"]').val(data.name);
                      $('[name="txtemailubah"]').val(data.email);
					 $('[name="txttelpubah"]').val(data.no_hp);
				    $('#modalubah').modal('show');
 
                    }
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
			      filename : "user",
				    exportOptions: {
                    columns: [0,1,2,3,4]
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
	 ],
    "ordering": true,
    "searching": true,
    "serverSide": true,
	"bDestroy": true,
    
 
  "ajax":{
          url :"<?php echo base_url('user/datauserjson'); ?>", // json datasource
          type: "post",
			  // method  , by default get
          
        },
		
		// <th  class="text-center">Nama </th>
          // <th  class="text-center">Email</th>
		  // <th  class="text-center">No.HP</th>
		  // <th  class="text-center">Id Wallet</th>
		  // <th  class="text-center">Tgl.Daftar</th>
		
		"columns": [
			
			{ "data": "nama"},
			{ "data": "email"},
			{ "data": "no_hp"},
			{ "data": "id_wallet"},
			{ "data": "tgl_daftar"},
			{ "data": "aksi"},
			{ "data": "id"},
			
		]
  
  });
 
	}
	
	function tambahpelanggan(){
		 $('#modaltambah').modal('show');
	}
	
</script>
