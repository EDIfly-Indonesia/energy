<style>
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
	  	
    <br><table id="list-data" class="table table-bordered table-striped">
      <thead>
        <tr>
          <th>Kode Barang</th>
          <th>Nama Barang</th>
          <th>Jumlah</th>
          <th>Harga</th>
		 
		  <th>Total</th>
         <th></th>
        </tr>
      </thead>
     
    </table>
	</div>
  </div>
</div>

 
  

<div id="tempat-modal"></div>

<script type="text/javascript">
var _idubah=0;
var statuslaundry=-1;
var jenisbayar=-1;
    $(document).ready(function() {
		
	getdata("<?=$id?>");
	});
	
	
	
	

	
	
	function getdata(id){

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
	 {targets: [-3,-2,-1],
         className: 'right'
     },
	 ],
    "ordering": true,
    "searching": true,
    "serverSide": true,
	"bDestroy": true,
    
 
  "ajax":{
          url :"<?php echo base_url('transaksi/getdetail/'); ?>"+id, // json datasource
          type: "post",
			  // method  , by default get
          
        },
		
		"columns": [
			
			{ "data": "kode_brg"},
			{ "data": "nama_brg"},
			{ "data": "jml_brg"},
			{ "data": "harga_brg"},
		    { "data": "total"},
			
			
		]
  
  });
 
	}
	

	
</script>
