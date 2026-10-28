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
		  <th  class="text-center">Biaya per KWH</th>
		  <th  class="text-center">Biaya Per jam</th>
          <th  class="text-center">Mitra</th>
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
          <h3 class="modal-title text-white">Jenis Member Baru</h3>
          <button class="close" type="button" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true" class="text-white">×</span>
          </button>
        </div>
      
        <div class="modal-body">
         <form>
         <div class="form-group">
                  <label for="exampleInputOwnerName">Nama Jenis Member  </label>
                  <input type="text" name="txtjenismember" class="form-control" id="txtjenismember"
                         placeholder="Enter Jenis Member">
                </div>

                <div class="form-group">
                  <label for="exampleInputEmail1">Biaya per KWH</label>
                  <input type="number" name="txtbiayaperkwh" class="form-control" id="txtbiayaperkwh"
                         placeholder="Enter Biaya per KWH">
                </div>

				<div class="form-group">
                  <label for="exampleInputEmail1">Biaya per Jam</label>
                  <input type="number" name="txtbiayaperjam" class="form-control" id="txtbiayaperjam"
                         placeholder="Enter Biaya Per jam">
                </div>
              
				<?php
                                $idtipe=getidtipe();
                                if($idtipe==1){
                                ?>
                                    <div class="form-group">
                                        <label for="exampleInputSupplier">Mitra</label>
                                        <select class="form-control" name="txtmitra" id="txtmitra">

                                           <?php foreach($daftarmitra as $u):?>
                                            <option value="<?php echo $u->id?>"><?php echo $u->name?></option>
                                            <?php endforeach;?>
										</select>
                                    </div>
                                
								<?php
                                }
                                ?>
			
               
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
                  <label for="exampleInputOwnerName">Nama Jenis Member  </label>
                  <input type="text" name="txtjenismemberubah" class="form-control" id="txtjenismemberubah"
                         placeholder="Enter Jenis Member">
                </div>

                <div class="form-group">
                  <label for="exampleInputEmail1">Biaya per KWH</label>
                  <input type="number" name="txtbiayaperkwhubah" class="form-control" id="txtbiayaperkwhubah"
                         placeholder="Enter Biaya per KWH">
                </div>

				<div class="form-group">
                  <label for="exampleInputEmail1">Biaya per Jam</label>
                  <input type="number" name="txtbiayaperjamubah" class="form-control" id="txtbiayaperjamubah"
                         placeholder="Enter Biaya Per jam">
                </div>
              
				<?php
                                $idtipe=getidtipe();
                                if($idtipe==1){
                                ?>
                                    <div class="form-group">
                                        <label for="exampleInputSupplier">Mitra</label>
                                        <select class="form-control" name="txtmitraubah" id="txtmitraubah">

                                           <?php foreach($daftartenant as $u):?>
                                            <option value="<?php echo $u->id?>"><?php echo $u->name?></option>
                                            <?php endforeach;?>
										</select>
                                    </div>
                                
								<?php
                                }
                                ?>
			
			
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
  $('#txtjenismember').focus();
})
	
	function kosong(){
		$('#txtjenismember').val("");
		$('#txtbiayaperjam').val("");
		$('#txtbiayaperkwh').val("");
		
	}
	function simpandata(){
	    
	  
	
		    var _jenismember=$('#txtjenismember').val();
			var _mitra=$('#txtmitra').val() || 0;
			var _biayaperjam=$('#txtbiayaperjam').val();
		    var _biayaperkwh=$('#txtbiayaperkwh').val();
          
			
		  
		  if(_jenismember==null || _jenismember=="") {
			  alert("Jenis Member harus diisi!"); return;
		  }
		  
		  if(_biayaperjam==null || _biayaperjam=="") {
			  alert("Biaya per jam harus diisi!"); return;
		  }
		  
		  if(_biayaperkwh==null || _biayaperkwh=="") {
			  alert("Biaya per KWH harus diisi!"); return;
		  }
		 
		
            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('member/simpandata')?>",
               // dataType : "JSON",
                data : {  nama_member:_jenismember,
					      mitra:_mitra,
						  biaya_perkwh : _biayaperkwh,
						  biaya_perjam :_biayaperjam 
				
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
	
		 var _jenismember=$('#txtjenismemberubah').val();
		 var _biayaperjam=$('#txtbiayaperjamubah').val();
		 var _biayaperkwh=$('#txtbiayaperkwhubah').val();
		 var _mitra=$('#txtmitraubah').val() || 0;
			
		 if(_jenismember==null || _jenismember=="") {
			  alert("Jenis Member harus diisi!"); return;
		  }
		  
		  if(_biayaperjam==null || _biayaperjam=="") {
			  alert("Biaya per jam harus diisi!"); return;
		  }
		  
		  if(_biayaperkwh==null || _biayaperkwh=="") {
			  alert("Biaya per KWH harus diisi!"); return;
		  }
		 
		
            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('member/simpanubah')?>",
               // dataType : "JSON",
                data : { 
							id:_idubah,
							nama_member:_jenismember,
					      mitra:_mitra,
						  biaya_perkwh : _biayaperkwh,
						  biaya_perjam :_biayaperjam 
							
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
                url  : "<?php echo base_url('member/hapus')?>",
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
                    url : "<?php echo base_url('member/getdataubah');?>",
                    method : "POST",
                   data: {id:id},
                   dataType : 'json',
                    success: function(data){
						
						_idubah=data.id_jenismember;
					  $('[name="idubah"]').val(data.id_jenismember);
					  $('[name="txtjenismemberubah"]').val(data.nama_member);
                      $('[name="txttenantubah"]').val(data.id_mitra);
					  $('[name="txtbiayaperkwhubah"]').val(data.biaya_perkwh);
					  $('[name="txtbiayaperjamubah"]').val(data.biaya_perjam);
					 
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
	{targets: [1,2],
         className: 'right'
     },
	 ],
    "ordering": true,
    "searching": true,
    "serverSide": true,
	"bDestroy": true,
    
 
  "ajax":{
          url :"<?php echo base_url('member/datajson'); ?>", // json datasource
          type: "post",
			  // method  , by default get
          
        },
		
		"columns": [
			
			{ "data": "nama_member"},
			{ "data": "biaya_perkwh"},
			{ "data": "biaya_perjam"},
			{ "data": "mitra"},
			{ "data": "aksi"},
			{ "data": "id"},
			
		]
  
  });
 
	}
	
	function tambahpelanggan(){
		 $('#modaltambah').modal('show');
	}
	
</script>
