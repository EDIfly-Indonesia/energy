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
          <th class="text-center">ChargeBox ID</th>
          <th class="text-center">Nama Chargebox</th>
          <th class="text-center">Last Ping</th>
		  <th class="text-center">Mitra</th>
          <th class="text-center">Area</th>
		  <th class="text-center">Alamat</th>
          <th class="text-center">Jml.Konektor</th>
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
                                    <label for="exampleInputOwnerName">Description</label>
                                    <input type="text" name="txtdeskripsi" class="form-control" id="txtdeskripsi"
                                    >
                                </div>
								
								<?php
                                $idtipe=getidtipe();
                                if($idtipe==1){
                                ?>
                                    <div class="form-group">
                                        <label for="exampleInputSupplier">Tenant</label>
                                        <select class="form-control" name="tenant" id="tenant">

                                           <?php foreach($daftarmitra as $u):?>
                                            <option value="<?php echo $u->id?>"><?php echo $u->name?></option>
                                            <?php endforeach;?>
									</select>
                                    </div>
                                
								<?php
                                }
                                ?>
								 <div class="form-group">
                                    <label for="exampleInputAddress">Satuan Durasi</label>
                                   <select name="txtsatuandurasi" id="txtsatuandurasi" class="form-control" data-placeholder="Pilih Status" required>
                                   <option value="h">jam</option>
                                    <option value="m">menit</option>
                                </select>
								
								
                                </div>

								
                                
                                
								
								<div class="form-group">
                                    <label for="exampleInputAddress">Latitude</label>
                                    <input type="text" name="txtlatitude" class="form-control" id="txtlatitude"
                                    >
                                </div>
								
								<div class="form-group">
                                    <label for="exampleInputAddress">Longitude</label>
                                    <input type="text" name="txtlongitude" class="form-control" id="txtlongitude"
                                    >
                                </div>
                    <div class="form-group">
                                    <label for="exampleInputAddress">Nilai PJU (%)</label>
                                    <input type="number" name="txtpju" class="form-control" id="txtpju"
                                    >
                    </div>
								 <div class="form-group">
                                    <label for="exampleInputAddress">Pakai PPN?</label>
                                   <select name="txtpakaippn" id="txtpakaippn" class="form-control" onchange="aturppn()" required>
                                   <option value="1">Ya</option>
                                    <option value="0">Tidak</option>
                                </select>
								
								
                                </div>
                      <div class="form-group" id="boxppn">
                                    <label for="exampleInputAddress">Nilai PPN (%)</label>
                                    <input type="number" name="txtnilaippn" class="form-control" id="txtnilaippn" value="<?=$nilaippn?>" readonly
                                    >
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
var tenantlama=null;
    $(document).ready(function() {
     
		getdata();
    
	});
	
	

  function aturppn(){
   _isppn= $('#txtpakaippn').val();
 
    if(_isppn=="1") {
      document.getElementById("boxppn").style.visibility = "visible";
    } else   document.getElementById("boxppn").style.visibility = "hidden";
    //alert("tes");
  }
	function simpandata(){
	    
	   
	    
	
		    var _nama=$('#add_owner_name').val();
			var _alamat=$('#add_owner_address').val();
		
			var _nomorhp=$('#add_owner_phone').val();
			var _email=$('#add_owner_email').val();
			var _pass=$('#add_owner_password').val();
			var _fee=$('#add_owner_fee').val();
			
          
			
		  
		  if(_nama==null || _nama=="") {
			  alert("Nama Mitra harus diisi!"); return;
		  }
		  
		  if(_nomorhp==null || _nomorhp=="") {
			  alert("Nomor HP harus diisi!"); return;
		  }
		 
		
            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('owner/simpanmitra')?>",
               // dataType : "JSON",
                data : { owner_name:_nama,
					       owner_address:_alamat,
							owner_phone:_nomorhp,
							owner_email:_email,
							owner_fee:_fee,
							owner_password:_pass,
						
				
				},
                success: function(response){
					
                    alert(response);
                    var table = $('#list-data').DataTable();
					table.draw(false);
					
					$('#modaltambah').modal('hide');
					kosong();
                    
                },
				
            });
	}
	
	function simpanubah(){
		var idtipe=<?php echo $idtipe?>;
	
		 var _deskripsi=$('#txtdeskripsi').val();
		 var _satuandurasi=$('#txtsatuandurasi').val();
	     
		 var _lat=$('#txtlatitude').val();
		 var _long=$('#txtlongitude').val();
		 var _isppn=$('#txtpakaippn').val();
		 var _pju=$('#txtpju').val();
         var _tenant= idtipe==1?  $('#tenant').val() : tenantlama;
		  
		 
		 
		
            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('chargebox/simpanubah')?>",
               // dataType : "JSON",
                data : { 
							id:_idubah,
							deskripsi:_deskripsi,
							tenant:_tenant,
							satuandurasi:_satuandurasi,
							
							lat:_lat,
							vlong:_long,
							pakaippn:_isppn,
							pju:_pju,
							
				
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
                url  : "<?php echo base_url('owner/hapus')?>",
               // dataType : "JSON",
                data : { owner_id:id,
						
				
				},
                success: function(response){
					
                    
                    var table = $('#list-data').DataTable();
					table.draw(false);;
					
					
                    
                },
				
            });
	}
	
	function ubah(id){
		 	
	

	 $.ajax({
                    url : "<?php echo base_url('chargebox/getdatachargebox');?>",
                    method : "POST",
                   data: {id:id},
                   dataType : 'json',
                    success: function(data){
						_idubah=data.charge_box_id;
						
				
					  $('[name="txtdeskripsi"]').val(data.description);
					  $('[name="tenant"]').val(data.tenant_pk);
					  tenantlama=data.tenant_pk;
                      $('[name="txtsatuandurasi"]').val(data.duration_unit);
					  $('[name="txthargadurasi"]').val(data.price_per_duration);
					  $('[name="txthargakwh"]').val(data.price_per_kwh);
					  $('[name="txtlatitude"]').val(data.location_latitude);
					  $('[name="txtlongitude"]').val(data.location_longitude);
					  $('[name="txtpakaippn"]').val(data.use_ppn);
					  $('[name="txtpju"]').val(data.pju);
           
				    $('#modalubah').modal('show');
 
                    }
                });
               
               
	 }
	function getdata(){
		
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
	 {targets: [-3],
        "className": "right",
     },
	 ],
    "ordering": true,
    "searching": true,
    "serverSide": true,
	"bDestroy": true,
	"aaSorting": [[1,'asc']],
    
 
  "ajax":{
          url :"<?php echo base_url('chargebox/datajson'); ?>", // json datasource
          type: "post",
			  // method  , by default get
          
        },

       // <th>ChargeBox ID</th>
          // <th>Nama Chargebox</th>
          // <th>Last Ping</th>
		  // <th>Mitra</th>
          // <th>Area</th>
		  // <th>Alamat</th>
          // <th>Jml.Konektor</th>
		  // <th>Aksi</th>
		
		"columns": [
			
			{ "data": "chargebox_id"},
			{ "data": "nama_chargebox"},
			{ "data": "last_ping"},
			
			{ "data": "mitra"},
			{ "data": "nama_area"},
			{ "data": "alamat"},
			{ "data": "jumkonektor"},
			{ "data": "aksi"},
			{ "data": "id"},
			
			
		]
  
  });
 
	}
	
	function tambahdata(){
		 $('#modaltambah').modal('show');
	}
	
</script>
