<style>

#right{float:right}
</style>

<div class="msg" style="display:none;">
  <?php  echo @$this->session->flashdata('msg'); ?>
</div>

<div class="box">
  
  <!-- /.box-header -->
  <div class="box-body">
  	
<div class="btn-group" id="right">
						<a href="<?php echo base_url('pengguna/tambahhakakses'); ?>" class="btn btn-primary float-right">Tambah</a>
						
			</div><br><br>
						
	
	  <div class="table-responsive" style="min-height: 500px;">
    <table id="list-data" class="table table-bordered table-striped">
      <thead>
        <tr>
         <th>Nama </th>
          <th>Aksi </th>
		 <th>Aksi</th>
	     <th>Nama </th>
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
          <h3 class="modal-title text-white">Pelanggan Baru</h3>
          <button class="close" type="button" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true" class="text-white">×</span>
          </button>
        </div>
      
        <div class="modal-body">
         <form>
          <div class="form-group row">
                    <label for="" class="col-md-4 col-form-label">Nama Pelanggan</label>
                    <div class="col-md-8">
					 
                        <input type="text" id="txtnama" class="form-control" name="txtnama" required>
                    </div>
          </div>
          <div class="form-group row">
                    <label for="" class="col-md-4 col-form-label">Alamat</label>
                    <div class="col-md-8">
                        <input type="txt" id="txtalamat" class="form-control" name="txtalamat" required>
                    </div>
          </div>
		  
		  <div class="form-group row">
                    <label for="" class="col-md-4 col-form-label">Kota</label>
                    <div class="col-md-3">
                        <input type="text" id="txtkota" name="txtkota" class="form-control">
                    </div>
					<label for="" class="col-md-2 col-form-label">Kode Pos</label>
                    <div class="col-md-3">
                        <input type="text" id="txtkodepos" name="txtkodepos" class="form-control">
                    </div>
          </div>
		  
		  
		    <div class="form-group row">
                    
					<label for="" class="col-md-4 col-form-label">Nomor HP</label>
                    <div class="col-md-3">
                        <input type="text" id="txtnohp" name="txtnohp" class="form-control">
                    </div>
					 <label for="" class="col-md-2 col-form-label">Email</label>
                    <div class="col-md-3">
                        <input type="text" id="txtemail" name="txtemail" class="form-control">
                    </div>
            </div>
			
			
			<div class="form-group row">
                   
					
					<label for="" class="col-md-4 col-form-label">Status</label>
                    <div class="col-md-3">
                        <select name="txtstatus" id="txtstatus" class="form-control" data-placeholder="Pilih Satuan" required>
                           <option value="1">Aktif</option>
                            <option value="0">Tidak Aktif</option>
                        </select>
                    </div>
					<label for="" class="col-md-2 col-form-label">Agen</label>
                    <div class="col-md-3">
                        <select name="txtagen" id="txtagen" class="form-control" data-placeholder="Pilih Satuan" required>
                           <option value="0">Tanpa Agen</option>
                          <?php foreach($agen as $u):?>
                                <option value="<?php echo $u->id?>"><?php echo $u->nama_agen?></option>
                            <?php endforeach;?>
                        </select>
                    </div>
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
          <div class="form-group row">
                    <label for="" class="col-md-4 col-form-label">Nama Pelanggan</label>
                    <div class="col-md-8">
					 <input type="hidden" name="idubah" id="idubah" class="form-control" placeholder="Id" readonly>
                        <input type="text" id="txtnamaubah" class="form-control" name="txtnamaubah" required>
                    </div>
          </div>
          <div class="form-group row">
                    <label for="" class="col-md-4 col-form-label">Alamat</label>
                    <div class="col-md-8">
                        <input type="txt" id="txtalamatubah" class="form-control" name="txtalamatubah" required>
                    </div>
          </div>
		  
		  <div class="form-group row">
                    <label for="" class="col-md-4 col-form-label">Kota</label>
                    <div class="col-md-3">
                        <input type="text" id="txtkotaubah" name="txtkotaubah" class="form-control">
                    </div>
					<label for="" class="col-md-2 col-form-label">Kode Pos</label>
                    <div class="col-md-3">
                        <input type="text" id="txtkodeposubah" name="txtkodeposubah" class="form-control">
                    </div>
          </div>
		  
		  
		    <div class="form-group row">
                    <label for="" class="col-md-4 col-form-label">Email</label>
                    <div class="col-md-3">
                        <input type="text" id="txtemailubah" name="txtemailubah" class="form-control">
                    </div>
					<label for="" class="col-md-2 col-form-label">Nomor HP</label>
                    <div class="col-md-3">
                        <input type="text" id="txtnohpubah" name="txtnohpubah" class="form-control">
                    </div>
            </div>
			
			
			<div class="form-group row">
                    <label for="" class="col-md-4 col-form-label">Agen</label>
                    <div class="col-md-3">
                        <select name="txtagenubah" id="txtagenubah" class="form-control" data-placeholder="Pilih Satuan" required>
                           <option value="0">Pilih Agen</option>
                          <?php foreach($agen as $u):?>
                                <option value="<?php echo $u->id?>"><?php echo $u->nama_agen?></option>
                            <?php endforeach;?>
                        </select>
                    </div>
					
					<label for="" class="col-md-2 col-form-label">Status</label>
                    <div class="col-md-3">
                        <select name="txtstatusubah" id="txtstatusubah" class="form-control" data-placeholder="Pilih Satuan" required>
                           <option value="1">Aktif</option>
                            <option value="0">Tidak Aktif</option>
                        </select>
                    </div>
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

var _idhakakses=0;
    $(document).ready(function() {
		getdata();
		
	});
	
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
			
           
            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('pengguna/simpanubahpengguna')?>",
               // dataType : "JSON",
                data : { nama:_nama, email:_email,hakakses:_hakakses,id:id},
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
		 
			
            var _nama=$('#txtnamaubah').val();
			var _email=$('#txtemailubah').val();
			var _username=$('#txtusername').val();
			var _hakakses=$('#txthakakses').val();
           
            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('pengguna/simpanpengguna')?>",
               // dataType : "JSON",
                data : { nama:_nama,
							password:_password,
							email:_email,
							type_id:_hakakses,
							code:_username,
				
				},
                success: function(response){
					
                    
                    var table = $('#table-1').DataTable();
					table.draw(false);;
					
					$('#modaltambah').modal('hide');
                    
                },
				
            });
          
        });
		
		function ubahpengguna(name,id,username,email,hakakses){
			_idhakakses=hakakses;
			$('[name="txtnamaubah"]').val(name);
			$('[name="txtusernameubah"]').val(username);
			$('[name="txtemailubah"]').val(email);
		     $('[name="txthakaksesubah"]').val(hakakses);
			 $('[name="idubah"]').val(id);
			 gethakakses(2);
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
						document.getElementById(_idhakakses).selected = true;
						}
 
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
	 
	 {
        targets: [-2,-1],
        visible: false
     },
	 
	 ],
    "ordering": true,
    "searching": true,
    "serverSide": true,
	"bDestroy": true,
    
 
  "ajax":{
          url :"<?php echo base_url('pengguna/datahakaksesjson'); ?>", // json datasource
          type: "post",
			  // method  , by default get
          
        },
		"columns": [
			
			{ "data": "code"},
			{ "data": "aksi"},
			{ "data": "aksi"},
			{ "data": "code"},
			
			
		]
  
  });
  
 
	}
</script>
