<style>

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
          <th  class="text-center">Nama Member</th>
		  <th  class="text-center">Email</th>
		  <th  class="text-center">No.HP</th>
		  <th  class="text-center">Jenis Member</th>
          <th  class="text-center">Biaya per KWH</th>
		  <th  class="text-center">Biaya per Jam</th>
          <th  class="text-center">Aksi</th>
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
          <h3 class="modal-title text-white">Member Baru</h3>
          <button class="close" type="button" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true" class="text-white">×</span>
          </button>
        </div>
      
        <div class="modal-body">
         <form>
         <div class="form-group">
                  <label for="exampleInputOwnerName">Nama Member  </label>
                  <input type="text" name="txtnama" class="form-control" id="txtnama"
                         placeholder="Enter Nama Member">
                </div>

                <div class="form-group">
                  <label for="exampleInputEmail1">Email member</label>
                  <input type="text" name="txtemail" class="form-control" id="txtemail"
                         placeholder="Enter Email Member">
                </div>
				
				

				<div class="form-group">
                  <label for="exampleInputEmail1">No.HP Member</label>
                  <input type="number" name="txthp" class="form-control" id="txthp"
                         placeholder="Enter No.HP Member">
                </div>
              
			
                                    <div class="form-group">
                                        <label for="exampleInputSupplier">Jenis Member</label>
                                        <select class="form-control" name="txtjenis" id="txtjenis">

                                           <?php foreach($daftarjenismember as $u):?>
                                            <option value="<?php echo $u->id?>"><?php echo $u->name?></option>
                                            <?php endforeach;?>
										</select>
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
          <h3 class="modal-title text-white">Ubah Data Member</h3>
          <button class="close" type="button" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true" class="text-white">×</span>
          </button>
        </div>
      
        <div class="modal-body">
         <form>
             
			<div class="form-group">
                  <label for="exampleInputOwnerName">Nama Member  </label>
                  <input type="text" name="txtnamaubah" class="form-control" id="txtnamaubah"
                         placeholder="Enter Nama Member">
                </div>

                <div class="form-group">
                  <label for="exampleInputEmail1">Email member</label>
                  <input type="text" name="txtemailubah" class="form-control" id="txtemailubah"
                         placeholder="Enter Email Member">
                </div>
				
				

				<div class="form-group">
                  <label for="exampleInputEmail1">No.HP Member</label>
                  <input type="number" name="txthpubah" class="form-control" id="txthpubah"
                         placeholder="Enter No.HP Member">
                </div>
              
			
                                    <div class="form-group">
                                        <label for="exampleInputSupplier">Jenis Member</label>
                                        <select class="form-control" name="txtjenisubah" id="txtjenisubah">

                                           <?php foreach($daftarjenismember as $u):?>
                                            <option value="<?php echo $u->id?>"><?php echo $u->name?></option>
                                            <?php endforeach;?>
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
var _idalamat=0;
    $(document).ready(function() {
		
		getdata();
	});
	
	$('#modaltambah').on('shown.bs.modal', function() {
  $('#txtnama').focus();
})
	
	function kosong(){
		$('#txtnama').val("");
		$('#txtemail').val("");
		$('#txthp').val("");
		
	}
	function simpandata(){
	    
	  
	
		    var _nama=$('#txtnama').val();
			var _email=$('#txtemail').val() ;
			var _nohp=$('#txthp').val() ;
			var _jenismember=$('#txtjenis').val() || 0 ;
			
		   
          
			
		  
		  if(_nama==null || _nama=="") {
			  alert("Nama member harus diisi!"); return;
		  }
		  
		  if(_email==null || _email=="") {
			  alert("Email harus diisi!"); return;
		  }
		  
		 
		  
		
		 
		
            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('member/simpanmember')?>",
               // dataType : "JSON",
                data : {  nama_member:_nama,
					      no_hp:_nohp,
						  email_member:_email,
						  id_jenismember : _jenismember,
						 
				
				},
                success: function(response){
			
                    var table = $('#list-data').DataTable();
					table.draw(false);
					
					$('#modaltambah').modal('hide');
					kosong();
                    
                },
				
            });
	}
	
	function simpanubah(){
	
			 var _nama=$('#txtnamaubah').val();
			var _email=$('#txtemailubah').val() ;
			var _nohp=$('#txthpubah').val() ;
			var _jenismember=$('#txtjenisubah').val() || 0 ;
			
		   if(_nama==null || _nama=="") {
			  alert("Nama member harus diisi!"); return;
		  }
		  
		  if(_email==null || _email=="") {
			  alert("Email harus diisi!"); return;
		  }
		 
		 
            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('member/simpanmemberubah')?>",
               // dataType : "JSON",
                data : { 
							id:_idubah,
							nama_member:_nama,
							no_hp:_nohp,
							email_member:_email,
							id_jenismember : _jenismember,
							
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
                url  : "<?php echo base_url('member/hapusmember')?>",
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
                    url : "<?php echo base_url('member/getdatamember');?>",
                    method : "POST",
                   data: {id:id},
                   dataType : 'json',
                    success: function(data){
						
						_idubah=data.id_member;
					  $('[name="idubah"]').val(data.id_member);
					  $('[name="txtnamaubah"]').val(data.nama_member);
					  $('[name="txtemailubah"]').val(data.email_member);
                      $('[name="txthpubah"]').val(data.no_hp);
					  $('[name="txtjenisubah"]').val(data.id_jenismember);
					
					 
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
	{targets: [4,5],
         className: 'right'
     },
	 ],
    "ordering": true,
    "searching": true,
    "serverSide": true,
	"bDestroy": true,
    
 
  "ajax":{
          url :"<?php echo base_url('member/datamemberjson'); ?>", // json datasource
          type: "post",
			  // method  , by default get
          
        },
		// tr>
          // <th  class="text-center">Nama Member</th>
		  // <th  class="text-center">Email</th>
		  // <th  class="text-center">No.HP</th>
		  // <th  class="text-center">Jenis Member</th>
          // <th  class="text-center">Biaya per KWH</th>
		  // <th  class="text-center">Biaya per Jam</th>
          // <th  class="text-center">Aksi</th>
         // <th></th>
		"columns": [
			
			{ "data": "nama_member"},
			{ "data": "email_member"},
			{ "data": "no_hp"},
			{ "data": "jenis_member"},
			{ "data": "biaya_perkwh"},
			{ "data": "biaya_perjam"},
			{ "data": "aksi"},
			{ "data": "id"},
			
		]
  
  });
 
	}
	
	function tambahpelanggan(){
		 $('#modaltambah').modal('show');
	}
	
</script>
