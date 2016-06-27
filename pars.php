<?php
    
$file = $argv[1];

$f = json_decode(file_get_contents($file));

foreach($f->sources as $id => $fname){
    
    //Prevent creating file in parent folders
    $fname = str_replace('../','',$fname);
    
    if(!file_exists(dirname($fname)))
       mkdir(dirname($fname), 0777, true);
   
    file_put_contents($fname,$f->sourcesContent[$id]);

    print_r($fname."\n");
}

?>