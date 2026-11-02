import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import TrainingPracticalForm from '../app/training/TrainingPracticalForm';

test('practical forms carry the exact module identifier separately for every rendered module',()=>{
 for(const code of ['CONTRACT_PACKAGE_GATE_MASTER','FINANCE_MASTER']){
  const markup=renderToStaticMarkup(React.createElement(TrainingPracticalForm,{moduleCode:code,children:React.createElement('input',{name:'trainingData',defaultValue:'TRAINING-001'})}));
  assert.match(markup,new RegExp(`type="hidden" name="moduleCode" value="${code}"`));
  assert.match(markup,/name="trainingData"/);
 }
});
