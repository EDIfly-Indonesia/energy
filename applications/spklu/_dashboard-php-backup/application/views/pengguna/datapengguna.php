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
						<a href="javascript:void(0);" class="btn btn-primary float-right" onclick="tambahpengguna();">Tambah</a>
						
			</div><br><br>
			<?php }?>
              <div class="table-responsive" style="min-height: 500px;">
                <table class="table table-striped" id="table-1" >
                  <thead>
                    <tr>
					 <th>Usernama</th>
                      <th>Nama</th>
                      <th>Email</th>
                      <th>Hak akses</th>
                      <th>Status</th>
					  <th>Aksi</th>
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
          <h5 class="modal-title text-white">Pengguna Baru</h5>
          <button class="close" type="button" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true" class="text-white">×</span>
          </button>
        </div>
      
        <div class="modal-body">
         <form>
          <div class="form-group row">
                    <label for="" class="col-md-4 col-form-label">Nama</label>
                    <div class="col-md-8">
					 <input type="hidden" name="idubah" id="idubah" class="form-control" placeholder="Id" readonly>
                        <input type="text" id="txtnama" class="form-control" name="txtnama" required>
                    </div>
          </div>
          <div class="form-group row">
                    <label for="" class="col-md-4 col-form-label">Username</label>
                    <div class="col-md-8">
                        <input type="txtusername" id="txtusername" class="form-control" name="txtkodeubah" required>
                    </div>
          </div>
		  
		  <div class="form-group row">
                    <label for="" class="col-md-4 col-form-label">Email</label>
                    <div class="col-md-8">
                        <input type="text" id="txtemail" name="txtemail" class="form-control">
                    </div>
          </div>
		  
		   <div class="form-group row">
                    <label for="" class="col-md-4 col-form-label">Password</label>
                    <div class="col-md-8">
                        <input type="text" id="txtpassword" name="txtpassword" class="form-control">
                    </div>
          </div>
		  
		    <div class="form-group row">
                    <label for="" class="col-md-4 col-form-label">Hak Akses</label>
                    <div class="col-md-8">
                        <select name="txthakakses" id="txthakakses" class="form-control" data-placeholder="Pilih Hak Akses" onchange="getdatarole(1);"required>
                           <option>Pilih Hak akses</option>
                           
                        </select>
                    </div>
                </div>
				
				 <div class="form-group row">
                    <label for="" class="col-md-4 col-form-label">Mitra</label>
                    <div class="col-md-8">
                        <select name="txtdatarole" id="txtdatarole" class="form-control" data-placeholder="Pilih Mitra" required>
                           <option>Pilih </option>
                           
                        </select>
                    </div>
                </div>
               
        </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" type="button" data-dismiss="modal">Batal</button>
          <button class="btn btn-primary" id="btn_add" >Simpan</button>
        </div>
       
      </div>
    </div>
  </div>
  
   <div class="modal fade" id="modalubah" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
    <div class="modal-dialog " role="document">
      <div class="modal-content">
        <div class="modal-header bg-primary">
          <h5 class="modal-title text-white">Ubah Pengguna</h5>
          <button class="close" type="button" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true" class="text-white">×</span>
          </button>
        </div>
      
        <div class="modal-body">
         <form>
          <div class="form-group row">
                    <label for="" class="col-md-4 col-form-label">Nama</label>
                    <div class="col-md-8">
					 <input type="hidden" name="idubah" id="idubah" class="form-control" placeholder="Id" readonly>
                        <input type="text" id="txtnamaubah" class="form-control" name="txtnamaubah" required>
                    </div>
          </div>
          <div class="form-group row">
                    <label for="" class="col-md-4 col-form-label">Username</label>
                    <div class="col-md-8">
                        <input type="text" id="txtusernameubah" class="form-control" name="txtusernameubah" readonly>
                    </div>
          </div>
		   
		  <div class="form-group row">
                    <label for="" class="col-md-4 col-form-label">Email</label>
                    <div class="col-md-8">
                        <input type="text" id="txtemailubah" name="txtemailubah" class="form-control">
                    </div>
          </div>
		  
		    <div class="form-group row">
                    <label for="" class="col-md-4 col-form-label">Hak Akses</label>
                    <div class="col-md-8">
                        <select name="txthakaksesubah" id="txthakaksesubah" class="form-control" data-placeholder="Pilih Satuan" onchange="getdatarole(2);" required>
                           <option>Pilih Hak akses</option>
                           
                        </select>
                    </div>
                </div>
				
				 <div class="form-group row">
                    <label for="" class="col-md-4 col-form-label">Data Mitra</label>
                    <div class="col-md-8">
                        <select name="txtdataroleubah" id="txtdataroleubah" class="form-control" data-placeholder="Pilih Mitra" required>
                           <option>Pilih </option>
                           
                        </select>
                    </div>
                </div>
               
        </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" type="button" data-dismiss="modal">Batal</button>
          <button class="btn btn-primary" id="btn_ubah" >Simpan</button>
        </div>
       
      </div>
    </div>
  </div>
<div id="tempat-modal"></div>

<script type="text/javascript">

var _idrole=0;
var _idhakakses=0;
    $(document).ready(function() {
		
		getdata();
		
	});
	
	function getdatarole(jenis){
		var idjenis;
	

	
	if(jenis==1){
		idjenis=$('#txthakakses').val();
		
	}
	else 
	
	idjenis=$('#txthakaksesubah').val();
	
	if(idjenis==null ) idjenis= _idhakakses;
	

	
	
	if(idjenis==1){
	
	 var html = "<option value=''>Pilih </option>";
		 html += '<option value=0 selected>-</option>';
		 if(jenis==1)
		  $('#txtdatarole').html(html);
	  else   $('#txtdataroleubah').html(html);
		  return;
		  
	}
	 

	 $.ajax({
                    url : "<?php echo base_url('pengguna/getdatarole');?>",
                    method : "POST",
                    data : {jenis : idjenis},
                   
                    dataType : 'json',
                    success: function(data){
				
                         
                        var html = "<option value=''>Pilih </option>";
                        var i;
                        
						if(jenis==1){
							for(i=0; i<data.length; i++){
                            html += '<option value='+data[i].id+'>'+data[i].name+'</option>';
                        }
                        $('#txtdatarole').html(html);
						}
						
						else  {
						    
						  
						    
							var ket="";
							for(i=0; i<data.length; i++){
								
								if(data[i].id==_idrole) ket="selected";
								
								
                            html += '<option value='+data[i].id+' '+ ket +' >'+data[i].name+'</option>';
							ket="";
							
							$('#txtdataroleubah').html(html);
						
						}
							
						
						}
 
                    }
                });
                return false;
		}
	
	function hapusdata(id){
	
	
   if(confirm("Hapus data ?" )==false) return;
   
    //var _tgl1=$('#datetimepicker1').data('date');
	


	$.ajax({
                    url : "<?php echo base_url('pengguna/hapusdata');?>",
                    method : "POST",
                    data : {idperson:id,
							
							},
                   
                  
                    success: function(data){
			
					if(data=="sukses") {alert("Data berhasil dihapus");
						  var table = $('#table-1').DataTable();
							table.draw(false);;
						}
						else
						alert("Data gagal dihapus");
					
					 }
                });

 
	}	
	
	 $('#btn_ubah').on('click',function(){
		 
		 var id=$('#idubah').val();
		
            var _nama=$('#txtnamaubah').val();
			var _email=$('#txtemailubah').val();
			var _hakakses=$('#txthakaksesubah').val();
		   var _role=$('#txtdataroleubah').val();
		   
           
            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('pengguna/simpanubahpengguna')?>",
               // dataType : "JSON",
                data : { nama:_nama,
                         id:id,
						 email:_email,
						type_id:_hakakses,
				        role:_role,
		
				},
                success: function(response){
					var table = $('#table-1').DataTable();
					table.draw(false);;
					
					$('#modalubah').modal('hide');
                    
                },
				
            });
          
        });
	function tambahpengguna(){
		
			gethakakses(1);
			}
	
	$('#btn_add').on('click',function(){
		 
			
            var _nama=$('#txtnama').val();
			var _email=$('#txtemail').val();
			var _username=$('#txtusername').val();
			var _hakakses=$('#txthakakses').val();
			var _password=$('#txtpassword').val();
			var _idrole=$('#txtdatarole').val();
		
			
			if(_nama=="" || _nama==null) {
			    alert("Nama harus diisi");
			    return;
			
			}
				if(_nama=="" || _nama==null) {
			    alert("Nama harus diisi");
			    return;
			
			}
				if(_email=="" || _email==null) {
			    alert("Email harus diisi");
			    return;
			
			}
				if(_username=="" || _username==null) {
			    alert("Username harus diisi");
			    return;
			
			}
			
				if(_username.length <4) {
			    alert("Minimal 4 Karakter");
			    return;
			
			}
				if(_hakakses=="" || _hakakses==null) {
			    alert("Hak Akses harus diisi");
			    return;
			
			}
			
		
           
            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('pengguna/simpanpengguna')?>",
               // dataType : "JSON",
                data : { nama:_nama,
							password:_password,
							email:_email,
							type_id:_hakakses,
							code:_username,
							role:_idrole,
				
				},
                success: function(response){
					
                   
                    var table = $('#table-1').DataTable();
					table.draw(false);;
					
					$('#modaltambah').modal('hide');
                    
                },
				
            });
          
        });
		
		function ubahpengguna(name,id,username,email,hakakses,idrole){
		  
			
			_idhakakses=hakakses;
		
			_idrole=idrole;
			$('[name="txtnamaubah"]').val(name);
			$('[name="txtusernameubah"]').val(username);
			$('[name="txtemailubah"]').val(email);
		     $('[name="txthakaksesubah"]').val(hakakses);
			 $('[name="idubah"]').val(id);
			 
			 gethakakses(2);
			 getdatarole(2);
			  $('[name="txtidroleubah"]').val(idrole);
			 $('#modalubah').modal('show');
	}
	function gethakakses(jenis){
		 	
		

	 $.ajax({
                    url : "<?php echo base_url('pengguna/gethakakses');?>",
                    method : "POST",
                  
                   dataType : 'json',
                    success: function(data){
				
                        
                        var html = "<option value=''>Pilih Hak Akses</option>";
                        var i;
						if(jenis==1){
                        for(i=0; i<data.length; i++){
                            html += '<option value='+data[i].id+'>'+data[i].code+'</option>';
                        }
						
                        $('#txthakakses').html(html);
						 $('#modaltambah').modal('show');
						}
						
						else {
							var ket="";
							for(i=0; i<data.length; i++){
								if(data[i].id==_idhakakses) ket="selected";
                            html += '<option value='+data[i].id+' '+ ket +' >'+data[i].code+'</option>';
							ket="";
                        }
						// 
                        $('#txthakaksesubah').html(html);
						//document.getElementById(_idhakakses).selected = true;
						}
 
                    }
                });
               
	 }
	function getdata(){
		var datatable=   $('#table-1').DataTable( {
      
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
	 
	 ],
    "ordering": true,
    "searching": true,
    "serverSide": true,
	"bDestroy": true,
    
 
  "ajax":{
          url :"<?php echo base_url('pengguna/datapenggunajson'); ?>", // json datasource
          type: "post",
			  // method  , by default get
          
        },
		"columns": [
			
			{ "data": "code"},
			{ "data": "name"},
			{ "data": "email"},
			{ "data": "hakakses"},
			{ "data": "status"},
			{ "data": "aksi"},
			
			
			
		]
  
  });
  
 
	}
</script>
