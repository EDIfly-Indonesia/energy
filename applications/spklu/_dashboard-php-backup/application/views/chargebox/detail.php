<style>

.right {
                text-align: right;
            }
</style>

<div class="msg" style="display:none;">
  <?php  echo @$this->session->flashdata('msg'); ?>
</div>

<div class="box">
  
  <!-- /.box-header -->
  <div class="box-body">
   <?php
			if($access->c) {?>
  	 <!--<div class="btn-group" id="right">
						<a href="javascript:void(0);" class="btn btn-primary float-right" onclick="tambahdata();">Tambah</a>
						
	</div><br><br>-->
	<?php }?>
	  <div class="table-responsive" style="min-height: 500px;">
    <table id="list-data" class="table table-bordered table-striped">
      <thead>
        <tr>
          <th>Connector ID</th>
          <th>Electric Power</th>
          <th>Connector Type</th>
		  <th>Harga Per Kwh</th>
          <th>Harga Per Jam</th>
		  <th>Aksi</th>
          <th></th>
        </tr>
      </thead>
     
    </table>
	</div>
  </div>
</div>

 <div class="modal fade" id="modaltambah" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header bg-primary">
          <h3 class="modal-title text-white">Mitra Baru</h3>
          <button class="close" type="button" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true" class="text-white">×</span>
          </button>
        </div>
      
        <div class="modal-body">
         <form>
         <div class="form-group">
                  <label for="exampleInputOwnerName">Owner Name</label>
                  <input type="text" name="add_owner_name" class="form-control" id="add_owner_name"
                         placeholder="Enter Owner Name">
                </div>

                <div class="form-group">
                  <label for="exampleInputEmail1">Email Address</label>
                  <input type="email" name="add_owner_email" class="form-control" id="add_owner_email"
                         placeholder="Enter email">
                </div>


                <div class="form-group">
                  <label for="exampleInputPhone">Phone Number</label>
                  <input type="tel" name="add_owner_phone" class="form-control" id="add_owner_phone"
                         placeholder="Enter phone number">
                </div>

                <div class="form-group">
                  <label for="exampleInputAddress">Owner Address</label>
                  <input type="text" name="add_owner_address" class="form-control" id="add_owner_address"
                         placeholder="Enter Owner address">
                </div>

                  <div class="form-group">
                      <label for="exampleInputAddress">Owner Password</label>
                      <input type="password" name="add_owner_password" class="form-control" id="add_owner_password"
                             placeholder="Enter Password">
                  </div>
                  
                   <div class="form-group">
                      <label for="exampleInputAddress">Fee (in %)</label>
                      <input type="text" name="add_owner_fee" value="10" class="form-control" id="add_owner_fee"
                             placeholder="Enter Fee">
                  </div>
			
			
               
        </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" type="button" data-dismiss="modal">Batal</button>
          <button class="btn btn-primary" id="btn_add" onclick="simpandata();" >Simpan</button>
        </div>
       
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

                                    <input type="hidden" name="id" class="form-control" id="id"
                                           >
                                </div>
								<div class="form-group">
                                    <label for="exampleInputOwnerName">Electric Power</label>
                                    <input type="text" name="txtpower" class="form-control" id="txtpower"
                                    >
                                </div>
								
								<div class="form-group">
                                    <label for="exampleInputOwnerName">Connector type</label>
                                    <input type="text" name="txttype" class="form-control" id="txttype"
                                    >
                                </div>

								<div class="form-group">
                                    <label for="exampleInputAddress">Harga per jam</label>
                                    <input type="number" name="txthargadurasi" class="form-control" id="txthargadurasi"
                                    >
                                </div>
                                 <div class="form-group">
                                    <label for="exampleInputAddress">Harga per kwh</label>
                                    <input type="number" name="txthargakwh" class="form-control" id="txthargakwh"
                                      >
                                </div>
                                
                                
								
								
								   

			
			
        </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" type="button" data-dismiss="modal">Batal</button>
          <button class="btn btn-primary" id="btn_add" onclick="simpanubahconnector();" >Simpan</button>
        </div>
       
      </div>
    </div>
  </div>
  

<div id="tempat-modal"></div>

<script type="text/javascript">
var _idubah=0;
var _idalamat=0;
    $(document).ready(function() {
     
		getdata("<?=  base64_decode($id)?>");
    
	});
	
	

	
	
	function simpanubahconnector(){
	
		 var _type=$('#txttype').val();
		 var _power=$('#txtpower').val();
	     var _hargadurasi=$('#txthargadurasi').val();
		 var _hargakwh=$('#txthargakwh').val();
		 var _admin=$('#txtadminfee').val();
		
		  
		 
		 
		
            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('chargebox/simpanubahconnector')?>",
               // dataType : "JSON",
                data : { 
							id:_idubah,
							electric_power:_power,
							connector_type:_type,
							harga_perjam:_hargadurasi,
							harga_perkwh:_hargakwh,
							
							
				
				},
                success: function(response){
					
                    var table = $('#list-data').DataTable();
					table.draw(false);
					
					$('#modalubah').modal('hide');
                    
                },
				
            });
	}
	
	
	function ubah(id){
		 	
	

	 $.ajax({
                    url : "<?php echo base_url('chargebox/getdataconnector');?>",
                    method : "POST",
                   data: {id:id},
                   dataType : 'json',
                    success: function(data){
						_idubah=data.id;
						
				
					  $('[name="txtpower"]').val(data.electric_power);
					  $('[name="txttype"]').val(data.connector_type);
                      $('[name="txthargadurasi"]').val(data.harga_perjam);
					  $('[name="txthargakwh"]').val(data.harga_perkwh);
					  
           
				    $('#modalubah').modal('show');
 
                    }
                });
               
               
	 }
	function getdata(chargebox){
	
		
		var datatable=   $('#list-data').DataTable( {
      
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
	 {targets: [3,4,5],
        "className": "right",
     },
	 ],
    "ordering": true,
    "searching": true,
    "serverSide": true,
	"bDestroy": true,
	"aaSorting": [[1,'asc']],
    
 
  "ajax":{
          url :"<?php echo base_url('chargebox/datadetailjson/'); ?>" + chargebox, // json datasource
          type: "post",
		 data : { id:chargebox,
						
				
				},
			  // method  , by default get
          
        },
// <th>Connector ID</th>
          // <th>Electric Power</th>
          // <th>Connector Type</th>
		  // <th>Harga Per Kwh</th>
          // <th>Price Per Jam</th>
		  // <th>Aksi</th>
     
		"columns": [
			
			{ "data": "connector_id"},
			{ "data": "electric_power"},
			{ "data": "connector_type"},
			{ "data": "harga_perkwh"},
			{ "data": "harga_perjam"},

			
			{ "data": "aksi"},
			{ "data": "id"},
			
			
		]
  
  });
 
	}
	
	function tambahdata(){
		 $('#modaltambah').modal('show');
	}
	
</script>
