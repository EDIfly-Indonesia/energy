<style>

#right{float:right}
</style>

<div class="msg" style="display:none;">
  <?php  echo @$this->session->flashdata('msg'); ?>
</div>

<div class="box">
  
  <!-- /.box-header -->
  <div class="box-body">
  	
<form action="<?php echo base_url('/pengguna/simpanhakakses')?>" method="post">
<div class="card">
    <div class="card-header">
        <div class="row">
            <div class="col-md-6">
                <div class="row">
                    <label for="" class="col-form-label col-md-4">Hak Akses</label>
                    <div class="col-md-8"><input type="text" name="data[code]" class="form-control" required></div>
                </div>
            </div>
            <div class="col-md-6 mt-md-0 mt-2 text-md-right">
                <label for="check-all" class="col-form-label"><input type="checkbox" id="check-all"> Super User</label>
            </div>
        </div>
    </div>
    <table class="table">
        <tbody>
            <?php foreach($user_access as $a):?>
                <tr>
                    <th><input type="checkbox" name="access[<?php echo $a->id ?>][access_id]" value="<?php echo $a->id ?>" id="check-<?php echo $a->id ?>"> <?php echo $a->name ?></th>
                    <th colspan="4"></th>
                </tr>
                <?php foreach($a->child as $c):?>
                <tr>
                    <td class="pl-4"><input <?php echo $c->id?'checked':''?> value="<?php echo $c->id?>" name="access[<?php echo $c->id ?>][access_id]" id="check-<?php echo $c->id ?>" type="checkbox" class="child" parent="<?php echo $a->id ?>"> <?php echo $c->name ?></td>
                    <td><input name="access[<?php echo $c->id ?>][c]" value="1" parent="<?php echo $c->id ?>" class="child" type="checkbox"> Create</td>
                    <td><input name="access[<?php echo $c->id ?>][u]" value="1" parent="<?php echo $c->id ?>" class="child" type="checkbox"> Update</td>
                    <td><input name="access[<?php echo $c->id ?>][d]" value="1"parent="<?php echo $c->id ?>" class="child" type="checkbox"> Delete</td>
                   
                </tr>
                <?php endforeach;?>
            <?php endforeach;?>
        </tbody>
    </table>
    <div class="card-footer text-right">
       
        <button class="btn btn-primary">Simpan</button>
    </div>
</div>
</form>
  </div>
</div>

 
<div id="tempat-modal"></div>

<script type="text/javascript">

var _idhakakses=0;
    $(document).ready(function() {
			
		$('#check-all').change(function(){
			
        if(!this.checked) $('.table').find('input').prop('checked',false);
		else
        $('.table').find('input').prop('checked',true);
    });
	
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
		 alert("tes");
			return;
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
					alert(response);
                    
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
