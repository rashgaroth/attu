import { FC, useContext, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { Typography, makeStyles, Theme } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { rootContext } from '@/context';
import { DataService, FieldHttp } from '@/http';
import DialogTemplate from '@/components/customDialog/DialogTemplate';
import AttuGrid from '@/components/grid/Grid';
import { ExportDataDialogProps } from './Types';
import { ColDefinitionsType } from '@/components/grid/Types';
import CustomInput from '@/components/customInput/CustomInput';
import { ITextfieldConfig } from '@/components/customInput/Types';
import { formatForm, formatFieldType, ensureFileExtension } from '@/utils';
import { useFormValidation } from '@/hooks';

const useStyles = makeStyles((theme: Theme) => ({
  desc: {
    margin: '8px 0 16px 0',
  },
  contentWrapper: {
    width: 580,
  },
  grid: {
    height: 240,
    width: 580,
  },
}));
const digitFormat = d3.format(',');

const ExportDataDialog: FC<ExportDataDialogProps> = props => {
  const { collection, cb } = props;
  const [exporting, setExporting] = useState<boolean>(false);
  const [selectedFields, setSelectedFields] = useState<FieldHttp[]>([]);
  const [form, setForm] = useState({
    filename: `${collection.collectionName}.json`,
  });
  const classes = useStyles();

  const { handleCloseDialog } = useContext(rootContext);
  const { t: dialogTrans } = useTranslation('dialog');
  const { t: warningTrans } = useTranslation('warning');
  const { t: collectionTrans } = useTranslation('collection');
  const { t: btnTrans } = useTranslation('btn');

  const checkedForm = useMemo(() => {
    const { filename } = form;
    return formatForm({ filename });
  }, [form]);

  const { validation, checkIsValid, disabled } = useFormValidation(checkedForm);

  const handleInputChange = (value: string) => {
    setForm({ filename: value });
  };
  const handleConfirm = async () => {
    setExporting(true);
    await DataService.exportData(collection.collectionName, {
      outputFields: selectedFields.map(s => s.name),
      filename: ensureFileExtension(form.filename, '.json'),
    });
    setExporting(false);
    handleCloseDialog();
    cb && cb();
  };

  const colDefinitions: ColDefinitionsType[] = [
    {
      id: 'name',
      align: 'left',
      disablePadding: true,
      label: collectionTrans('fieldName'),
      sortBy: 'name',
    },
    {
      id: 'data_type',
      align: 'left',
      disablePadding: false,
      formatter: formatFieldType,
      label: collectionTrans('fieldType'),
    },
  ];

  const fileInputCfg: ITextfieldConfig = {
    label: collectionTrans('exportFileName'),
    key: 'filename',
    onChange: handleInputChange,
    variant: 'filled',
    placeholder: collectionTrans('exportFileName'),
    fullWidth: true,
    validations: [
      {
        rule: 'require',
        errorText: warningTrans('required', {
          name: collectionTrans('name'),
        }),
      },
    ],
    disabled: exporting,
    defaultValue: form.filename,
  };

  return (
    <DialogTemplate
      title={dialogTrans('exportTitle', {
        type: collection.collectionName,
      })}
      showCancel={false}
      handleClose={handleCloseDialog}
      children={
        <div className={classes.contentWrapper}>
          <Typography
            variant="body1"
            component="p"
            className={classes.desc}
            dangerouslySetInnerHTML={{
              __html: collectionTrans('exportDataDialogInfo'),
            }}
          ></Typography>
          <CustomInput
            type="text"
            textConfig={fileInputCfg}
            checkValid={checkIsValid}
            validInfo={validation}
          />

          <Typography
            variant="body1"
            component="p"
            className={classes.desc}
            dangerouslySetInnerHTML={{
              __html: dialogTrans('selectFieldToExport', {
                count: selectedFields.length,
                total: digitFormat(Number(collection.rowCount)),
              }),
            }}
          ></Typography>
          <div className={classes.grid}>
            <AttuGrid
              toolbarConfigs={[]}
              colDefinitions={colDefinitions}
              rows={collection.schema.fields.map(f => new FieldHttp(f))}
              rowCount={collection.schema.fields.length}
              primaryKey="name"
              selected={selectedFields}
              setSelected={setSelectedFields}
              showPagination={false}
              disableSelect={exporting}
            />
          </div>
        </div>
      }
      confirmLabel={`${btnTrans('export')} to ${ensureFileExtension(
        form.filename,
        '.json'
      )}`}
      handleConfirm={handleConfirm}
      confirmDisabled={disabled || selectedFields.length === 0 || exporting}
    />
  );
};

export default ExportDataDialog;
