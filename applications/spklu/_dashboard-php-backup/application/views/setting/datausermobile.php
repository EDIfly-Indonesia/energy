<style>
.table th {
  text-align: center;
}
#right{float:right}
table.dataTable tfoot th {
    text-align: right;
}
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
      <label for="" class="col-md-3">Toko</label>
                    <div class="col-md-4">
  <select name="txtshop" id="txtshop" class="form-control" data-placeholder="Pilih Toko" onchange="getdata(this.value);" required>
                           <option value="0">Semua</option>
                          <?php foreach($daftartoko as $u):?>
                                <option value="<?php echo $u->id?>"><?php echo $u->namatoko?></option>
                            <?php endforeach;?>
                        </select>
                        </div>
                         </div>
   </div>
   </div>
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
          <th>Nama</th>
          <th>Email</th>
          <th>Telp</th>
          <th>UserType</th>
          <th>Toko</th>
          <th>Status</th>
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
          <h3 class="modal-title text-white">Pengguna dan Kasir mobile baru</h3>
          <button class="close" type="button" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true" class="text-white">×</span>
          </button>
        </div>
      
        <div class="modal-body">
         <form>
         
          <div class="form-group">
                                    <label for="exampleInputOwnerName">Nama</label>
                                    <input type="text" name="txtnama" class="form-control" id="txtnama"
                                           >
                                </div>

                                <div class="form-group">
                                    <label for="exampleInputEmail1">Email address </label>
                                    <input type="email" name="txtemail" class="form-control" id="txtemail"
                                           
                                           >
                                </div>


                                <div class="form-group">
                                    <label for="exampleInputPhone">Telp</label>
                                    <input type="tel" name="txttelp" class="form-control" id="txttelp"
                                          
                                           >
                                </div>

                                <div class="form-group">
                                    <label for="exampleInputAddress">Usertipe</label>
                                     <select name="txttipeubah" id="txttipe" class="form-control" data-placeholder="Pilih Status" required>
                                   <option value="staff">Kasir</option>
                                    <option value="admin">Admin</option>
                                </select>
                                </div>
                                 <?php
                                $idtipe=getidtipe();
                                if($idtipe==3){
                                  
                                ?>
                                <div class="form-group">

                                    <div class="form-group">
                                        <label for="exampleInputSupplier">Pilih Toko</label>
                                        <select class="form-control" name="txttoko" id="txttoko">

                                             <?php foreach($daftartoko as $u):?>
                                    <option value="<?php echo $u->id?>"><?php echo $u->namatoko?></option>
                                <?php endforeach;?>
                                </select>
                                        </div>
                                    </div>
    
    			                <?php
                                }
                                ?>
                                
                                 <div class="form-group">
                                    <label for="exampleInputAddress">Status</label>
                                   <select name="txtstatusubah" id="txtstatus" class="form-control" data-placeholder="Pilih Status" required>
                                   <option value="1">Aktif</option>
                                    <option value="0">Tidak Aktif</option>
                                </select>
                                </div>
                                <div class="form-group">
                                    <label for="exampleInputEmail1">Password</label>
                                    <input type="text" name="txtpassword" class="form-control" id="txtpassword"
                                           
                                           >
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

                                    <input type="hidden" name="txtidubah" class="form-control" id="txtidubah"
                                           >
                                </div>
          <div class="form-group">
                                    <label for="exampleInputOwnerName">Nama</label>
                                    <input type="text" name="txtnamaubah" class="form-control" id="txtnamaubah"
                                           >
                                </div>

                                <div class="form-group">
                                    <label for="exampleInputEmail1">Email address <small>[Not Editable]</small> </label>
                                    <input type="email" name="txtemailubah" class="form-control" id="txtemailubah"
                                           readonly
                                           >
                                </div>


                                <div class="form-group">
                                    <label for="exampleInputPhone">Telp</label>
                                    <input type="tel" name="txttelpubah" class="form-control" id="txttelpubah"
                                          
                                           >
                                </div>

                                <div class="form-group">
                                    <label for="exampleInputAddress">Usertipe</label>
                                     <select name="txttipeubah" id="txttipeubah" class="form-control" data-placeholder="Pilih Status" required>
                                   <option value="staff">Staff</option>
                                    <option value="admin">Admin</option>
                                </select>
                                </div>
                                 
                                
                                 <div class="form-group">
                                    <label for="exampleInputAddress">Status</label>
                                   <select name="txtstatusubah" id="txtstatusubah" class="form-control" data-placeholder="Pilih Status" required>
                                   <option value="1">Aktif</option>
                                    <option value="0">Tidak Aktif</option>
                                </select>
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

    $(document).ready(function() {
		
		getdata();
	});
	
	
	function kosong(){
		$('#txtnama').val("");
		$('#txtalamat').val("");
		$('#txtkota').val("");
		$('#txtkodepos').val("");
		$('#txtnohp').val("");
		$('#txtemail').val("");
		$('#txtstatus').val("1");
		$('#txtagen').val("0");
	}
	function simpandata(){
	    
	   
	    
	
		    var _nama=$('#txtnama').val();
			var _tipe=$('#txttipe').val();
		    var _status=$('#txtstatus').val();
			var _nomorhp=$('#txttelp').val();
			var _email=$('#txtemail').val();
			var _pass1=$('#txtpassword').val();
		
			var _toko=$('#txttoko').val();
			
		
          
			if(_nama==null || _nama=="") {
			  alert("Nama  harus diisi!"); return;
		  }
		  
		  if(_email==null || _email=="") {
			  alert("Email  harus diisi!"); return;
		  }
		  
		  if(_pass1.length<6) {
			  alert("Password harus diisi minimal 6 karakter!"); return;
		  }
		  
	
		
            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('setting/simpanusermobile');?>",
               // dataType : "JSON",
                data : { name:_nama,
					     cell:_nomorhp,
						email:_email,
						password:_pass1,
						user_type:_tipe,
						shop_id:_toko,
						status:_status,
						
				
				},
                success: function(response){
				
                    var table = $('#list-data').DataTable();
					table.draw(false);
					
					$('#modaltambah').modal('hide');
				
                    
                },
				
            });
	}
	
	function simpanubah(){
	
		    var _nama=$('#txtnamaubah').val();
			var _telp=$('#txttelpubah').val();
		
			var _email=$('#txtemailubah').val();
			var _tipe=$('#txttipeubah').val();
			var _status=$('#txtstatusubah').val();
		
          
		  if(_nama==null || _nama=="") {
			  alert("Nama User harus diisi!"); return;
		  }
		  
		  if(_telp==null || _telp=="") {
			  alert("No HP harus diisi!"); return;
		  }
		 
		 
		
            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('setting/simpanubah')?>",
               // dataType : "JSON",
                data : { 
							id:_idubah,
							nama:_nama,
							telp:_telp,
							status:_status,
							tipe:_tipe,
							
				
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
                    url : "<?php echo base_url('setting/getdatausermobile');?>",
                    method : "POST",
                   data: {id_user:id},
                   dataType : 'json',
                    success: function(data){
						_idubah=data.id;
					  $('[name="txtidubah"]').val(data.id);
					  $('[name="txtnamaubah"]').val(data.name);
                      $('[name="txttelpubah"]').val(data.cell);
					  $('[name="txtemailubah"]').val(data.email);
					  $('[name="txttipeubah"]').val(data.user_type);
					  $('[name="txtstatus"]').val(data.status);
				     $('#modalubah').modal('show');
 
                    }
                });
               
	 }
	function getdata(){
		var _toko=$('#txtshop').val();
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
         className: 'center'
     },
	 ],
    "ordering": true,
    "searching": true,
    "serverSide": true,
	"bDestroy": true,
    
 
  "ajax":{
          url :"<?php echo base_url('setting/datausermobilejson'); ?>", // json datasource
          type: "post",
			  // method  , by default get
           data : {
		        shop_id: _toko
		    },
        },
		
		"columns": [
			
			{ "data": "nama"},
			{ "data": "email"},
			{ "data": "no_hp"},
			{ "data": "usertipe"},
			{ "data": "namatoko"},
			{ "data": "status"},
			{ "data": "aksi"},
			{ "data": "id"},
			
		]
  
  });
 
	}
	
	function tambahpelanggan(){
		 $('#modaltambah').modal('show');
	}
	
</script>
